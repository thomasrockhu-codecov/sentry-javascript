import { getEnvelopeEndpointWithUrlEncodedAuth, initAPIDetails } from '@sentry/core';
import { BaseTransportOptions, NewTransport, TransportOptions } from '@sentry/types';
import { supportsFetch } from '@sentry/utils';

import { BrowserOptions } from '../client';
import { makeNewFetchTransport } from './new-fetch';
import { makeNewXHRTransport } from './new-xhr';

export interface BrowserTransportOptions extends BaseTransportOptions {
  // options to pass into fetch request
  fetchParams: Record<string, string>;
  headers?: Record<string, string>;
  sendClientReports?: boolean;
}

/**
 * Sets up Browser transports based on the passed `options`. If available, the returned
 * transport will use the fetch API. In case fetch is not supported, an XMLHttpRequest
 * based transport is created.
 */
export function setupBrowserTransport(options: BrowserOptions): NewTransport {
  const transportOptions: TransportOptions = {
    ...options.transportOptions,
    // @ts-ignore figure out dsn stuff
    dsn: options.dsn,
    tunnel: options.tunnel,
    sendClientReports: options.sendClientReports,
    _metadata: options._metadata,
  };

  const api = initAPIDetails(transportOptions.dsn, transportOptions._metadata, transportOptions.tunnel);
  const url = getEnvelopeEndpointWithUrlEncodedAuth(api.dsn, api.tunnel);

  if (options.transport) {
    return options.transport;
  }

  if (supportsFetch()) {
    const requestOptions: RequestInit = { ...transportOptions.fetchParameters };
    return makeNewFetchTransport({ requestOptions, url });
  }

  return makeNewXHRTransport({
    url,
    headers: transportOptions.headers,
  });
}
