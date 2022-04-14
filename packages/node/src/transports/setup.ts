import { getEnvelopeEndpointWithUrlEncodedAuth, initAPIDetails } from '@sentry/core';
import { NewTransport, TransportOptions } from '@sentry/types';

import { NodeOptions } from '../types';
import { makeNodeTransport } from './new';

/**
 * Sets up Node transport based on the passed `options`.
 */
export function setupNodeTransport(options: NodeOptions): NewTransport {
  const transportOptions: TransportOptions = {
    ...options.transportOptions,
    ...(options.httpProxy && { httpProxy: options.httpProxy }),
    ...(options.httpsProxy && { httpsProxy: options.httpsProxy }),
    ...(options.caCerts && { caCerts: options.caCerts }),
    // @ts-ignore Come back to this
    // TODO(v7): Figure out how to enforce dsn
    dsn: options.dsn,
    tunnel: options.tunnel,
    _metadata: options._metadata,
  };

  if (options.transport) {
    return options.transport;
  }

  const api = initAPIDetails(transportOptions.dsn, transportOptions._metadata, transportOptions.tunnel);
  const url = getEnvelopeEndpointWithUrlEncodedAuth(api.dsn, api.tunnel);

  return makeNodeTransport({
    url,
    headers: transportOptions.headers,
    proxy: transportOptions.httpProxy,
    caCerts: transportOptions.caCerts,
  });
}
