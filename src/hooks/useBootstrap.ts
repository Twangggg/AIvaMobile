import { useEffect } from 'react';

import { useAuth } from '@/features/auth/hooks';

export function useBootstrap() {
  const { bootstrap } = useAuth();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);
}
