import * as Sentry from 'sentry-expo';

import { ENV } from './env';

if (ENV.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: ENV.EXPO_PUBLIC_SENTRY_DSN,
    enableInExpoDevelopment: true,
    debug: ENV.EXPO_PUBLIC_APP_ENV !== 'production',
  });
}
