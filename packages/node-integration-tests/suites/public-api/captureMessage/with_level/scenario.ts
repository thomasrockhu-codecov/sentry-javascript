import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: 'https://public@dsn.ingest.sentry.io/1337',
  release: '1.0',
});

Sentry.captureMessage('debug_message', 'debug');
Sentry.captureMessage('info_message', 'info');
Sentry.captureMessage('warning_message', 'warning');
Sentry.captureMessage('error_message', 'error');
Sentry.captureMessage('fatal_message', 'fatal');
Sentry.captureMessage('critical_message', 'critical');
Sentry.captureMessage('log_message', 'log');
