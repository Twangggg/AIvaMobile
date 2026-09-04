import { decode as atob, encode as btoa } from 'base-64';
import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, type Device } from 'react-native-ble-plx';

import {
  AIVA_CHARACTERISTICS,
  AIVA_SERVICE_UUID,
  type AIVACommand,
  type AIVAConfig,
  type AIVADeviceStatus,
  type AuthResult,
  type BLEScanDevice,
  CONFIG_CHUNK_SIZE,
  DEFAULT_SECRET_KEY,
  type WifiScanResult,
} from './ble.types';

let instance: BLEService | null = null;

export class BLEService {
  static getShared(): BLEService {
    if (!instance) instance = new BLEService();
    return instance;
  }

  private manager: BleManager;
  private connectedDevice: Device | null = null;
  private statusCallback: ((status: AIVADeviceStatus) => void) | null = null;
  private wifiScanCallback: ((result: WifiScanResult) => void) | null = null;
  private statusPollTimer: ReturnType<typeof setInterval> | null = null;
  private disconnectCallbacks: Set<() => void> = new Set();
  /** Serialize GATT reads/writes so status poll doesn't collide with config. */
  private opChain: Promise<void> = Promise.resolve();
  private pauseStatusPoll = false;

  constructor() {
    try {
      this.manager = new BleManager();
    } catch (e) {
      console.warn('[BLE] BleManager init failed:', e);
      throw e;
    }
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 31) {
        return PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN!,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT!,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION!,
        ]).then(
          (r) =>
            r[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN!] === 'granted' &&
            r[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT!] === 'granted',
        );
      }
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      return granted === 'granted';
    }
    return true;
  }

  async scanDevices(
    timeoutMs: number = 5000,
  ): Promise<BLEScanDevice[]> {
    const found: BLEScanDevice[] = [];

    const seen = new Set<string>();

    await this.manager.startDeviceScan(
      [AIVA_SERVICE_UUID],
      { allowDuplicates: false },
      (error, device) => {
        if (error) return;
        if (device?.name?.includes('AIVA') && !seen.has(device.id)) {
          seen.add(device.id);
          found.push({
            id: device.id,
            name: device.name,
            rssi: device.rssi ?? -100,
          });
        }
      },
    );

    await new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
    await this.manager.stopDeviceScan();
    return found;
  }

  async connect(deviceId: string): Promise<void> {
    const device = await this.manager.connectToDevice(deviceId);
    this.connectedDevice = device;
    await device.discoverAllServicesAndCharacteristics();
    device.onDisconnected(() => {
      this.handleDisconnect();
    });
    this.startStatusPolling();
  }

  private handleDisconnect(): void {
    this.statusCallback = null;
    this.wifiScanCallback = null;
    if (this.statusPollTimer) { clearInterval(this.statusPollTimer); this.statusPollTimer = null; }
    this.connectedDevice = null;
    this.disconnectCallbacks.forEach((cb) => cb());
  }

  private startStatusPolling(): void {
    const device = this.connectedDevice;
    if (!device) return;

    const poll = async () => {
      if (this.pauseStatusPoll || !this.connectedDevice) return;
      try {
        const char = await device.readCharacteristicForService(
          AIVA_SERVICE_UUID,
          AIVA_CHARACTERISTICS.STATUS,
        );
        if (!char?.value) return;
        const raw = atob(char.value).replace(/\0/g, '').trim();
        if (!raw || raw[0] !== '{') return;
        const status: AIVADeviceStatus = this.parseJSON<AIVADeviceStatus>(raw);
        this.statusCallback?.(status);
      } catch {
        // poll failed, retry next cycle
      }
    };
    poll();
    this.statusPollTimer = setInterval(poll, 2000);
  }

  private async withExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.opChain.then(async () => {
      this.pauseStatusPoll = true;
      try {
        return await fn();
      } finally {
        this.pauseStatusPoll = false;
      }
    });
    // Keep the chain alive even if this op fails.
    this.opChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async readCharacteristic(uuid: string): Promise<string> {
    const device = this.getDevice();
    const char = await device.readCharacteristicForService(
      AIVA_SERVICE_UUID,
      uuid,
    );
    if (!char?.value) return '';
    try {
      return atob(char.value);
    } catch {
      return '';
    }
  }

  private parseJSON<T>(raw: string): T {
    const cleaned = raw.replace(/\0/g, '').trim();
    if (!cleaned) {
      throw new Error('JSON parse error: empty payload');
    }
    try {
      return JSON.parse(cleaned) as T;
    } catch (first) {
      // Device sometimes appends noise or sends multiple JSON objects.
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(cleaned.slice(start, end + 1)) as T;
        } catch {
          // fall through
        }
      }
      throw new Error(
        `JSON parse error: ${(first as Error).message}, raw: ${JSON.stringify(cleaned.slice(0, 200))}`,
      );
    }
  }

  async authenticate(secretKey: string = DEFAULT_SECRET_KEY): Promise<boolean> {
    await this.writeCharacteristic(AIVA_CHARACTERISTICS.AUTH, secretKey);
    await new Promise((r) => setTimeout(r, 500));
    for (let i = 0; i < 15; i++) {
      const raw = await this.readCharacteristic(AIVA_CHARACTERISTICS.AUTH);
      if (raw) {
        try {
          const auth = this.parseJSON<AuthResult>(raw);
          if (auth.authed !== undefined) return auth.authed;
        } catch {}
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    return false;
  }

  waitForStatus(timeoutMs: number = 5000): Promise<AIVADeviceStatus> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Status timeout')), timeoutMs);
      const wrapped = (status: AIVADeviceStatus) => {
        clearTimeout(timeout);
        this.statusCallback = this.statusCallback === wrapped ? null : this.statusCallback;
        resolve(status);
      };
      const prev = this.statusCallback;
      this.statusCallback = (status) => {
        wrapped(status);
        prev?.(status);
      };
    });
  }

  async writeConfig(partial: Partial<AIVAConfig>): Promise<void> {
    return this.withExclusive(async () => {
      const json = JSON.stringify(partial, (_, v) => (v === undefined ? undefined : v));
      const payload = json + '\n';

      for (let i = 0; i < payload.length; i += CONFIG_CHUNK_SIZE) {
        const chunk = payload.slice(i, i + CONFIG_CHUNK_SIZE);
        await this.writeCharacteristic(AIVA_CHARACTERISTICS.CONFIG, chunk);
      }
      // Firmware needs a moment to apply before the next GATT op.
      await new Promise((r) => setTimeout(r, 400));
    });
  }

  /**
   * Soft config read — returns null when the device is busy instead of throwing.
   * Use for background refreshes after write / Wi‑Fi connect.
   */
  async tryReadConfig(retries: number = 8): Promise<AIVAConfig | null> {
    return this.withExclusive(async () => {
      for (let i = 0; i < retries; i++) {
        try {
          const raw = await this.readCharacteristic(AIVA_CHARACTERISTICS.CONFIG);
          if (raw && raw.includes('{')) {
            try {
              return this.parseJSON<AIVAConfig>(raw);
            } catch {
              // incomplete / mid-write payload
            }
          }
        } catch {
          // transient GATT error
        }
        await new Promise((r) => setTimeout(r, 350 + i * 100));
      }
      return null;
    });
  }

  async readConfig(): Promise<AIVAConfig> {
    const cfg = await this.tryReadConfig(10);
    if (!cfg) throw new Error('Config read empty after 10 retries');
    return cfg;
  }

  async sendCommand(command: AIVACommand): Promise<void> {
    const noResponse = command === 'reboot' || command === 'reset';
    await this.writeCharacteristic(
      AIVA_CHARACTERISTICS.COMMAND,
      command,
      !noResponse,
    );
  }

  /** JSON play commands; chunked like config, terminated with newline. */
  async sendJsonCommand(payload: object): Promise<void> {
    return this.withExclusive(async () => {
      const json = JSON.stringify(payload) + '\n';
      for (let i = 0; i < json.length; i += CONFIG_CHUNK_SIZE) {
        const chunk = json.slice(i, i + CONFIG_CHUNK_SIZE);
        await this.writeCharacteristic(AIVA_CHARACTERISTICS.COMMAND, chunk);
      }
      await new Promise((r) => setTimeout(r, 200));
    });
  }

  async scanWifi(timeoutMs: number = 10000): Promise<WifiScanResult> {
    const device = this.getDevice();
    await this.sendCommand('scan');

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const char = await device.readCharacteristicForService(
          AIVA_SERVICE_UUID,
          AIVA_CHARACTERISTICS.WIFISCAN,
        );
        if (char?.value) {
          const raw = atob(char.value).replace(/\0/g, '').trim();
          if (!raw || raw[0] !== '{') continue;
          try {
            const result: WifiScanResult = this.parseJSON<WifiScanResult>(raw);
            if (result.aps) return result;
          } catch {
            // incomplete wifi scan payload
          }
        }
      } catch {
        // read failed, retry
      }
    }
    return { aps: [] };
  }

  onStatusUpdate(callback: (status: AIVADeviceStatus) => void): void {
    this.statusCallback = callback;
  }

  onDisconnected(callback: () => void): void {
    this.disconnectCallbacks.add(callback);
  }

  onWifiScanResult(callback: (result: WifiScanResult) => void): void {
    this.wifiScanCallback = callback;
  }

  async disconnect(): Promise<void> {
    this.statusCallback = null;
    this.wifiScanCallback = null;
    this.disconnectCallbacks.clear();
    if (this.statusPollTimer) { clearInterval(this.statusPollTimer); this.statusPollTimer = null; }
    if (this.connectedDevice) {
      try {
        await this.connectedDevice.cancelConnection();
      } catch {}
      this.connectedDevice = null;
    }
  }

  get isConnected(): boolean {
    return this.connectedDevice !== null;
  }

  private getDevice(): Device {
    if (!this.connectedDevice) throw new Error('Not connected');
    return this.connectedDevice;
  }

  private async writeCharacteristic(
    uuid: string,
    value: string,
    withResponse: boolean = true,
  ): Promise<void> {
    const device = this.getDevice();
    const base64 = btoa(value);
    if (withResponse) {
      await device.writeCharacteristicWithResponseForService(
        AIVA_SERVICE_UUID,
        uuid,
        base64,
      );
    } else {
      await device.writeCharacteristicWithoutResponseForService(
        AIVA_SERVICE_UUID,
        uuid,
        base64,
      );
    }
  }

  destroy(): void {
    this.manager.destroy().catch(() => {});
  }
}
