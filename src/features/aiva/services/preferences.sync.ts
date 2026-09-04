import { supabase } from '@/lib/supabase';

import type { ChildProfile } from './children.storage';
import { DEFAULT_CHILD, loadChildrenState, saveChildrenState } from './children.storage';
import type { SafetySettings } from './safety.storage';
import { DEFAULT_SAFETY, loadSafetySettings, saveSafetySettings } from './safety.storage';

type PreferencesBlob = {
  children?: {
    children: ChildProfile[];
    activeChildId: string;
  };
  safety?: Partial<SafetySettings>;
};

/** Pull preferences from profiles.preferences into SecureStore (best-effort). */
export async function pullPreferencesFromCloud(): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', auth.user.id)
      .maybeSingle();
    if (error || !data?.preferences) return;
    const prefs = data.preferences as PreferencesBlob;
    if (prefs.children?.children?.length) {
      await saveChildrenState({
        children: prefs.children.children,
        activeChildId: prefs.children.activeChildId || prefs.children.children[0].id,
      });
    }
    if (prefs.safety) {
      await saveSafetySettings({ ...DEFAULT_SAFETY, ...prefs.safety });
    }
  } catch {
    // offline / schema not applied yet
  }
}

/** Push local children + safety into profiles.preferences. */
export async function pushPreferencesToCloud(): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const [children, safety] = await Promise.all([loadChildrenState(), loadSafetySettings()]);
    const preferences: PreferencesBlob = {
      children: {
        children: children.children.length ? children.children : [DEFAULT_CHILD],
        activeChildId: children.activeChildId || DEFAULT_CHILD.id,
      },
      safety,
    };
    await supabase.from('profiles').update({ preferences }).eq('id', auth.user.id);
  } catch {
    // ignore
  }
}
