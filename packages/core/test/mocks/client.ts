import { Session } from '@sentry/hub';
import { Event, Integration, Options, Severity, SeverityLevel, NewTransport, EventStatus } from '@sentry/types';
import { resolvedSyncPromise, resolve } from '@sentry/utils';

import { BaseClient } from '../../src/baseclient';
import { initAndBind } from '../../src/sdk';

export interface TestOptions extends Options {
  test?: boolean;
  mockInstallFailure?: boolean;
  enableSend?: boolean;
  defaultIntegrations?: Integration[] | false;
}

export class TestClient extends BaseClient<TestOptions> {
  public static instance?: TestClient;
  public static sendEventCalled?: (event: Event) => void;

  public event?: Event;
  public session?: Session;

  public constructor(options: TestOptions, transport: NewTransport) {
    super(options, transport);
    TestClient.instance = this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
  public eventFromException(exception: any): PromiseLike<Event> {
    return resolvedSyncPromise({
      exception: {
        values: [
          {
            /* eslint-disable @typescript-eslint/no-unsafe-member-access */
            type: exception.name,
            value: exception.message,
            /* eslint-enable @typescript-eslint/no-unsafe-member-access */
          },
        ],
      },
    });
  }

  public eventFromMessage(
    message: string,
    // eslint-disable-next-line deprecation/deprecation
    level: Severity | SeverityLevel = 'info',
  ): PromiseLike<Event> {
    return resolvedSyncPromise({ message, level });
  }

  public sendEvent(event: Event): void {
    this.event = event;
    if (this._options.enableSend) {
      super.sendEvent(event);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    TestClient.sendEventCalled && TestClient.sendEventCalled(event);
  }

  public sendSession(session: Session): void {
    this.session = session;
  }
}

export function init(options: TestOptions, transport: NewTransport): void {
  initAndBind(TestClient, options, transport);
}

export function setupTestTransport(options: TestOptions): NewTransport {
  const noop = {
    send: () =>
      resolvedSyncPromise({
        reason: 'NoopTransport: Event has been skipped because no Dsn is configured.',
        status: 'skipped' as EventStatus,
      }),
    flush: () => resolvedSyncPromise(true),
  };

  if (!options.dsn) {
    // We return the noop transport here in case there is no Dsn.
    return noop;
  }

  if (options.transport) {
    return this._options.transport;
  }

  return noop;
}
