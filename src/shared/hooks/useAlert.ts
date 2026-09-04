import { useCallback, useState } from 'react';

import type { AlertConfig } from '../components/AlertModal';

export function useAlert() {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig | null>(null);

  const alert = useCallback((title: string, message: string, buttons?: AlertConfig['buttons']) => {
    setConfig({ title, message, buttons });
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    setConfig(null);
  }, []);

  return { alert, AlertModalProps: { visible, config, onClose: close } };
}
