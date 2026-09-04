import { useAivaStore } from '@/features/aiva/aiva.store';
import { BLEService } from '@/services/ble/ble.service';
import type { AIVACommand, AIVAConfig } from '@/services/ble/ble.types';

import { loadIotBotUrl, saveIotBotUrl } from './iot.storage';
import type { DeviceCommand, DeviceEvent, DeviceStatusExt } from './protocol';
import { newCmdId } from './protocol';

type EventCb = (event: DeviceEvent) => void;

let instance: DeviceBridge | null = null;

export class DeviceBridge {
  static getShared(): DeviceBridge {
    if (!instance) instance = new DeviceBridge();
    return instance;
  }

  private botUrl = '';
  private ws: WebSocket | null = null;
  private poll: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<EventCb>();
  private lastEvtId = '';

  get url(): string {
    return this.botUrl;
  }

  get linked(): boolean {
    return useAivaStore.getState().device.iotLinked;
  }

  get ready(): boolean {
    const d = useAivaStore.getState().device;
    return d.connected || d.iotLinked;
  }

  onEvent(cb: EventCb): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(event: DeviceEvent): void {
    this.listeners.forEach((cb) => cb(event));
  }

  async hydrate(): Promise<void> {
    const saved = await loadIotBotUrl();
    if (saved) this.botUrl = saved.replace(/\/$/, '');
    useAivaStore.getState().updateDevice({ iotBotUrl: this.botUrl });
    if (this.botUrl) {
      try {
        await this.linkBot(this.botUrl);
      } catch {
        useAivaStore.getState().updateDevice({ iotLinked: false });
      }
    }
  }

  async linkBot(url: string): Promise<void> {
    const base = url.trim().replace(/\/$/, '');
    if (!base) throw new Error('empty bot url');
    const res = await fetch(`${base}/health`);
    if (!res.ok) throw new Error(`bot health ${res.status}`);
    const body = (await res.json()) as { ok?: boolean };
    if (!body.ok) throw new Error('bot not ok');
    this.botUrl = base;
    await saveIotBotUrl(base);
    useAivaStore.getState().updateDevice({ iotBotUrl: base, iotLinked: true });
    this.openWs();
    this.startPoll();
  }

  unlinkBot(): void {
    this.closeWs();
    if (this.poll) {
      clearInterval(this.poll);
      this.poll = null;
    }
    useAivaStore.getState().updateDevice({ iotLinked: false });
  }

  private openWs(): void {
    this.closeWs();
    if (!this.botUrl) return;
    const wsUrl = `${this.botUrl.replace(/^http/, 'ws')}/ws`;
    try {
      const ws = new WebSocket(wsUrl);
      this.ws = ws;
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as DeviceEvent & {
            type?: string;
            status?: DeviceStatusExt;
          };
          if (msg.status) this.applyStatus(msg.status);
          if (msg.type === 'event' && msg.event) {
            this.lastEvtId = msg.id;
            this.emit(msg);
          }
        } catch {
          // ignore malformed frames
        }
      };
      ws.onclose = () => {
        if (this.ws === ws) this.ws = null;
      };
    } catch {
      this.ws = null;
    }
  }

  private closeWs(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }

  private startPoll(): void {
    if (this.poll) clearInterval(this.poll);
    this.poll = setInterval(() => {
      void this.refreshStatus();
    }, 2500);
    void this.refreshStatus();
  }

  async refreshStatus(): Promise<void> {
    if (!this.botUrl || !this.linked) return;
    try {
      const res = await fetch(`${this.botUrl}/status`);
      if (!res.ok) return;
      const status = (await res.json()) as DeviceStatusExt;
      this.applyStatus(status);
      if (status.evt && status.evt_id && status.evt_id !== this.lastEvtId) {
        this.lastEvtId = status.evt_id;
        this.emit({
          type: 'event',
          event: status.evt,
          id: status.evt_id,
          session_id: status.session_id,
          payload: status.evt_payload,
        });
      }
    } catch {
      // bot unreachable
    }
  }

  private applyStatus(status: DeviceStatusExt): void {
    useAivaStore.getState().updateDevice({
      playState: status.play ?? 'idle',
      battery: typeof status.battery === 'number' ? status.battery : useAivaStore.getState().device.battery,
    });
  }

  async send(command: DeviceCommand | string): Promise<void> {
    const errors: string[] = [];
    if (BLEService.getShared().isConnected) {
      try {
        if (typeof command === 'string') {
          await BLEService.getShared().sendCommand(command as AIVACommand);
        } else {
          await BLEService.getShared().sendJsonCommand(command);
        }
      } catch (e) {
        errors.push((e as Error).message);
      }
    }
    if (this.linked && this.botUrl) {
      try {
        const res = await fetch(`${this.botUrl}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: typeof command === 'string' ? JSON.stringify(command) : JSON.stringify(command),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `bot ${res.status}`);
        }
      } catch (e) {
        errors.push((e as Error).message);
      }
    }
    if (!BLEService.getShared().isConnected && !this.linked) {
      throw new Error('no device');
    }
    if (errors.length && !BLEService.getShared().isConnected && this.linked) {
      throw new Error(errors.join('; '));
    }
  }

  async writeConfig(partial: Partial<AIVAConfig>): Promise<void> {
    if (BLEService.getShared().isConnected) {
      await BLEService.getShared().writeConfig(partial);
    }
    if (this.linked && this.botUrl) {
      await fetch(`${this.botUrl}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      });
    }
  }

  async speak(text: string): Promise<string> {
    const id = newCmdId();
    await this.send({ cmd: 'speak', id, text, interrupt: true });
    return id;
  }

  async announce(text: string): Promise<void> {
    await this.send({ cmd: 'announce', id: newCmdId(), text });
  }

  async quiet(): Promise<void> {
    await this.send('quiet');
  }

  async find(): Promise<void> {
    await this.send('find');
  }

  async setTarget(labels: string[], prompt?: string): Promise<void> {
    await this.send({ cmd: 'set_target', id: newCmdId(), labels, prompt });
  }

  async captureFor(kind: 'hunt' | 'cards', labels: string[]): Promise<void> {
    await this.send({ cmd: 'capture', id: newCmdId(), expect_labels: labels, activity_kind: kind });
  }
}
