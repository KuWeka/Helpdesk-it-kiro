import { AsyncLocalStorage } from 'async_hooks';

type RequestContextStore = {
  requestId?: string;
};

const requestContext = new AsyncLocalStorage<RequestContextStore>();

export function runWithRequestContext<T>(store: RequestContextStore, callback: () => T): T {
  return requestContext.run(store, callback);
}

export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}
