import * as core from '@shapeshiftoss/hdwallet-core'
import * as comlink from 'comlink'

// Much of this has been adapted from https://github.com/samburnstone/comlink-async-iterators/blob/master/src/iterableTransferHandlers.js

type BetterIterable<T, TReturn, TNext> = {
  [Symbol.iterator](): Iterator<T, TReturn, TNext>
}

type BetterAsyncIterable<T, TReturn, TNext> = {
  [Symbol.asyncIterator](): AsyncIterator<T, TReturn, TNext>
}

type BetterAsyncIterableIterator<T, TReturn, TNext> = AsyncIterator<T, TReturn, TNext> & {
  [Symbol.asyncIterator](): BetterAsyncIterableIterator<T, TReturn, TNext>
}

type IterableMessage<TReturn = any, TNext = undefined> =
  | {
      type: 'NEXT'
      value?: TNext
    }
  | {
      type: 'RETURN'
      value: TReturn
    }
  | {
      type: 'THROW'
      value: unknown
    }

type IterableTransferParams = {
  throw: boolean
  return: boolean
  port: MessagePort
}

function listenForIterableMessage(
  iterator: Iterator<any, any, any> | AsyncIterator<any, any, any>,
  port: MessagePort
) {
  port.onmessage = async ({ data: { type, value } }: { data: IterableMessage<any, any> }) => {
    // eslint-disable-next-line default-case
    switch (type) {
      case 'NEXT':
        port.postMessage(await iterator.next(value))
        break
      case 'RETURN':
        port.postMessage(await iterator.return?.(value))
        break
      case 'THROW':
        port.postMessage(await iterator.throw?.(value))
        break
    }
  }
}

function isStructuredClonable(x: unknown): boolean {
  if (!['object', 'function'].includes(typeof x)) return true
  core.assume<Record<PropertyKey, unknown>>(x)
  if (Array.isArray(x) || ArrayBuffer.isView(x)) return true
  for (const obj of [
    Boolean,
    String,
    Date,
    RegExp,
    Blob,
    File,
    FileList,
    ArrayBuffer,
    ImageBitmap,
    ImageData,
    Map,
    Set
  ]) {
    if (x instanceof obj) return true
  }
  if ([null, Object.prototype].includes(Reflect.getPrototypeOf(x))) {
    for (const k of Reflect.ownKeys(x)) {
      if (typeof k !== 'string' || !isStructuredClonable(x[k])) return false
    }
    return true
  }
  return false
}

comlink.transferHandlers.set('iterableTransferHandler', {
  canHandle<T, TReturn = any, TNext = undefined>(
    obj: unknown
  ): obj is BetterIterable<T, TReturn, TNext> | BetterAsyncIterable<T, TReturn, TNext> {
    const out =
      !isStructuredClonable(obj) &&
      core.isIndexable(obj) &&
      (typeof obj[Symbol.asyncIterator] === 'function' ||
        typeof obj[Symbol.iterator] === 'function')
    return out
  },
  serialize<T, TReturn = any, TNext = undefined>(
    iterable: BetterIterable<T, TReturn, TNext> | BetterAsyncIterable<T, TReturn, TNext>
  ) {
    const { port1, port2 } = new MessageChannel()

    const iterator = (() => {
      if (Symbol.asyncIterator in iterable) {
        core.assume<BetterAsyncIterable<T, TReturn, TNext>>(iterable)
        return iterable[Symbol.asyncIterator]()
      }
      core.assume<BetterIterable<T, TReturn, TNext>>(iterable)
      return iterable[Symbol.iterator]()
    })()

    listenForIterableMessage(iterator, port1)
    return [
      {
        throw: !!iterator.throw,
        return: !!iterator.return,
        port: port2
      },
      [port2]
    ]
  },
  deserialize<T, TReturn = any, TNext = undefined>({
    throw: hasThrow,
    return: hasReturn,
    port
  }: IterableTransferParams): BetterAsyncIterable<T, TReturn, TNext> {
    const nextPortMessage = () =>
      new Promise(resolve => {
        port.onmessage = ({ data }) => {
          resolve(data)
        }
      })

    // Cover the case where a user wants to be able to manually call the iterator methods
    const out: BetterAsyncIterableIterator<T, TReturn, TNext> = {
      async next(...args: [] | [TNext]): Promise<IteratorResult<T, TReturn>> {
        const msg: IterableMessage<TReturn, TNext> = {
          type: 'NEXT',
          value: args[0]
        }
        port.postMessage(msg)
        return (await nextPortMessage()) as IteratorResult<T, TReturn>
      },
      async return(value): Promise<IteratorResult<T, TReturn>> {
        port.postMessage({ type: 'RETURN', value: await value })
        return (await nextPortMessage()) as IteratorResult<T, TReturn>
      },
      async throw(value): Promise<IteratorResult<T, TReturn>> {
        port.postMessage({ type: 'THROW', value: await value })
        return (await nextPortMessage()) as IteratorResult<T, TReturn>
      },
      [Symbol.asyncIterator]() {
        return this
      }
    }

    // return and throw functions are optional (https://tc39.es/ecma262/#table-async-iterator-optional),
    // so we check they're available before providing them
    if (!hasReturn) delete out.return
    if (!hasThrow) delete out.throw

    return out
  }
})

comlink.transferHandlers.set('proxyTransferHandler', {
  canHandle(obj: unknown): obj is core.Indexable {
    return (
      !isStructuredClonable(obj) &&
      (typeof obj === 'function' ||
        (core.isIndexable(obj) &&
          ![null, Object.prototype, Function.prototype].includes(Reflect.getPrototypeOf(obj))))
    )
  },
  serialize(obj: core.Indexable) {
    const { port1, port2 } = new MessageChannel()
    comlink.expose(obj, port1)
    return [port2, [port2]]
  },
  deserialize(port: MessagePort): core.Indexable {
    return comlink.wrap<core.Indexable>(port)
  }
})
