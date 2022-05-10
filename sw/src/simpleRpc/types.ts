/// <reference lib="WebWorker" />

export type Asyncify<T> = {
  [K in keyof T]: T[K] extends (...args: infer R) => infer S
    ? (...args: R) => Promise<Awaited<S>>
    : never
}

export type Event = MessageEvent | ExtendableMessageEvent
export type EventSource<T extends Event> = T['source']
export type HandlerContext<T extends EventSource<any>> = {
  source: T
  transfer<T extends Transferable>(x: T): T
}
export type Methods<T extends EventSource<any>> = Record<
  string,
  (this: HandlerContext<T>, ...args: any) => Promise<unknown>
>
export type Listener<T extends Event> = (ev: T) => void
export type MessageReceiver<T extends Event> = {
  addEventListener(type: 'message' | 'messageerror', listener: Listener<T>): void
  removeEventListener?(type: 'message' | 'messageerror', listener: Listener<T>): void
}
export type MessageReceiverEvent<T extends MessageReceiver<any>> = T extends MessageReceiver<
  infer R
>
  ? R
  : never
export type ErrorHandler = (e: Error | unknown) => void

// The symbol version is more correct, but it seems to interfere with generating type declarations.
// declare const _simpleRpcWrapperBrand: unique symbol
declare const _simpleRpcWrapperBrand: '_simpleRpcWrapperBrand'
export type SimpleRpcWrapperLike<T extends Record<string, (...args: any) => Promise<any>>> = {
  postMessage(x: unknown, options: StructuredSerializeOptions): void
} & { [x in typeof _simpleRpcWrapperBrand]?: T }
export type SimpleRpcWrapper<T extends Record<string, (...args: any) => Promise<any>>> =
  SimpleRpcWrapperLike<T> & MessagePort
type Simplify<T> = { [K in keyof T]: T[K] }
export type SimpleRpcWrapperUnwrapped<T extends SimpleRpcWrapperLike<any>> = Simplify<
  Exclude<T[typeof _simpleRpcWrapperBrand], undefined>
>
export type SimpleRpcWrapperReturnType<
  T extends SimpleRpcWrapperLike<any>,
  U extends keyof SimpleRpcWrapperUnwrapped<T>,
> = Awaited<ReturnType<SimpleRpcWrapperUnwrapped<T>[U]>>
