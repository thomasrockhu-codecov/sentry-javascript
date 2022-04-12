import { ClientOptions, Options } from '@sentry/types';
import { makeDsn, stackParserFromOptions } from '@sentry/utils';

import { getIntegrationsToSetup } from './integration';
import { NoopTransport } from './transports/noop';

export const DEFAULT_MAX_BREADCRUMBS = 100;
export const DEFAULT_SAMPLE_RATE = 1;
export const DEFAULT_MAX_VALUE_LENGTH = 250;
export const DEFAULT_NORMALIZE_DEPTH = 3;
export const DEFAULT_NORMALIZE_MAX_BREADTH = 1000;
export const DEFAULT_SHUTDOWN_TIMEOUT = 2000;

export const defaultCoreOptions = {
  maxBreadcrumbs: DEFAULT_MAX_BREADCRUMBS,
  sampleRate: DEFAULT_SAMPLE_RATE,
  maxValueLength: DEFAULT_MAX_VALUE_LENGTH,
  normalizeDepth: DEFAULT_NORMALIZE_DEPTH,
  normalizeMaxBreadth: DEFAULT_NORMALIZE_MAX_BREADTH,
  shutdownTimeout: DEFAULT_SHUTDOWN_TIMEOUT,
};

/** JSDoc */
export function optionsToClientOptions(options: Options): ClientOptions {
  return {
    // TODO(v7): Remove NoopTransport
    transport: options.transport || NoopTransport,
    ...defaultCoreOptions,
    ...options,
    dsn: options.dsn === undefined ? undefined : makeDsn(options.dsn),
    stackParser: stackParserFromOptions(options),
    integrations: getIntegrationsToSetup(options),
  };
}
