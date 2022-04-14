import {
  AggregationCounts,
  DsnComponents,
  NewTransport,
  RequestSessionStatus,
  SdkMetadata,
  SentryRequestType,
  SessionAggregates,
  SessionEnvelope,
  SessionFlusherLike,
  SessionItem,
} from '@sentry/types';
import { createEnvelope, dropUndefinedKeys, dsnToString, logger } from '@sentry/utils';

import { IS_DEBUG_BUILD } from './flags';
import { getCurrentHub } from './hub';

type ReleaseHealthAttributes = {
  environment?: string;
  release: string;
};

/**
 * Creates an envelope from a Session
 *
 * This is copied from @sentry/core/src/request.ts
 * TODO(v7): Unify session envelope creation
 **/
export function createSessionEnvelope(
  sessionAggregates: SessionAggregates,
  dsn: DsnComponents,
  metadata: SdkMetadata,
  tunnel?: string,
): SessionEnvelope {
  const sdkInfo = metadata;
  const envelopeHeaders = {
    sent_at: new Date().toISOString(),
    ...(sdkInfo && { sdk: sdkInfo }),
    ...(!!tunnel && { dsn: dsnToString(dsn) }),
  };

  // I know this is hacky but we don't want to add `sessions` to request type since it's never rate limited
  const type = 'aggregates' in sessionAggregates ? ('sessions' as SentryRequestType) : 'session';

  // TODO (v7) Have to cast type because envelope items do not accept a `SentryRequestType`
  const envelopeItem = [{ type } as { type: 'session' | 'sessions' }, sessionAggregates] as SessionItem;
  const envelope = createEnvelope<SessionEnvelope>(envelopeHeaders, [envelopeItem]);

  return envelope;
}

/**
 * @inheritdoc
 */
export class SessionFlusher implements SessionFlusherLike {
  public readonly flushTimeout: number = 60;
  private _pendingAggregates: Record<number, AggregationCounts> = {};
  private _sessionAttrs: ReleaseHealthAttributes;
  private _intervalId: ReturnType<typeof setInterval>;
  private _isEnabled: boolean = true;
  private _transport: NewTransport;

  public constructor(
    transport: NewTransport,
    attrs: ReleaseHealthAttributes,
    private readonly _dsn: DsnComponents,
    private readonly _metadata: SdkMetadata,
    private readonly _tunnel?: string,
  ) {
    this._transport = transport;
    // Call to setInterval, so that flush is called every 60 seconds
    this._intervalId = setInterval(() => this.flush(), this.flushTimeout * 1000);
    this._sessionAttrs = attrs;
  }

  /** Sends session aggregates to Transport */
  public sendSessionAggregates(sessionAggregates: SessionAggregates): void {
    const env = createSessionEnvelope(sessionAggregates, this._dsn, this._metadata, this._tunnel);
    void this._transport.send(env).then(null, reason => {
      IS_DEBUG_BUILD && logger.error('Error while sending session:', reason);
    });
  }

  /** Checks if `pendingAggregates` has entries, and if it does flushes them by calling `sendSessions` */
  public flush(): void {
    const sessionAggregates = this.getSessionAggregates();
    if (sessionAggregates.aggregates.length === 0) {
      return;
    }
    this._pendingAggregates = {};
    this.sendSessionAggregates(sessionAggregates);
  }

  /** Massages the entries in `pendingAggregates` and returns aggregated sessions */
  public getSessionAggregates(): SessionAggregates {
    const aggregates: AggregationCounts[] = Object.keys(this._pendingAggregates).map((key: string) => {
      return this._pendingAggregates[parseInt(key)];
    });

    const sessionAggregates: SessionAggregates = {
      attrs: this._sessionAttrs,
      aggregates,
    };
    return dropUndefinedKeys(sessionAggregates);
  }

  /** JSDoc */
  public close(): void {
    clearInterval(this._intervalId);
    this._isEnabled = false;
    this.flush();
  }

  /**
   * Wrapper function for _incrementSessionStatusCount that checks if the instance of SessionFlusher is enabled then
   * fetches the session status of the request from `Scope.getRequestSession().status` on the scope and passes them to
   * `_incrementSessionStatusCount` along with the start date
   */
  public incrementSessionStatusCount(): void {
    if (!this._isEnabled) {
      return;
    }
    const scope = getCurrentHub().getScope();
    const requestSession = scope && scope.getRequestSession();

    if (requestSession && requestSession.status) {
      this._incrementSessionStatusCount(requestSession.status, new Date());
      // This is not entirely necessarily but is added as a safe guard to indicate the bounds of a request and so in
      // case captureRequestSession is called more than once to prevent double count
      if (scope) {
        scope.setRequestSession(undefined);
      }
      /* eslint-enable @typescript-eslint/no-unsafe-member-access */
    }
  }

  /**
   * Increments status bucket in pendingAggregates buffer (internal state) corresponding to status of
   * the session received
   */
  private _incrementSessionStatusCount(status: RequestSessionStatus, date: Date): number {
    // Truncate minutes and seconds on Session Started attribute to have one minute bucket keys
    const sessionStartedTrunc = new Date(date).setSeconds(0, 0);
    this._pendingAggregates[sessionStartedTrunc] = this._pendingAggregates[sessionStartedTrunc] || {};

    // corresponds to aggregated sessions in one specific minute bucket
    // for example, {"started":"2021-03-16T08:00:00.000Z","exited":4, "errored": 1}
    const aggregationCounts: AggregationCounts = this._pendingAggregates[sessionStartedTrunc];
    if (!aggregationCounts.started) {
      aggregationCounts.started = new Date(sessionStartedTrunc).toISOString();
    }

    switch (status) {
      case 'errored':
        aggregationCounts.errored = (aggregationCounts.errored || 0) + 1;
        return aggregationCounts.errored;
      case 'ok':
        aggregationCounts.exited = (aggregationCounts.exited || 0) + 1;
        return aggregationCounts.exited;
      default:
        aggregationCounts.crashed = (aggregationCounts.crashed || 0) + 1;
        return aggregationCounts.crashed;
    }
  }
}
