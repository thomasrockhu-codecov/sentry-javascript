import { getCurrentHub } from '@sentry/hub';
import { Client, NewTransport, Options } from '@sentry/types';
import { logger } from '@sentry/utils';

import { IS_DEBUG_BUILD } from './flags';

/** A class object that can instantiate Client objects. */
export type ClientClass<F extends Client, O extends Options> = new (options: O, transport: NewTransport) => F;

/**
 * Internal function to create a new SDK client instance. The client is
 * installed and then bound to the current scope.
 *
 * @param clientClass The client class to instantiate.
 * @param options Options to pass to the client.
 */
export function initAndBind<F extends Client, O extends Options>(
  clientClass: ClientClass<F, O>,
  options: O,
  transport: NewTransport,
): void {
  if (options.debug === true) {
    if (IS_DEBUG_BUILD) {
      logger.enable();
    } else {
      // use `console.warn` rather than `logger.warn` since by non-debug bundles have all `logger.x` statements stripped
      // eslint-disable-next-line no-console
      console.warn('[Sentry] Cannot initialize SDK with `debug` option using a non-debug bundle.');
    }
  }
  const hub = getCurrentHub();
  const scope = hub.getScope();
  if (scope) {
    scope.update(options.initialScope);
  }

  const client = new clientClass(options, transport);
  hub.bindClient(client);
}
