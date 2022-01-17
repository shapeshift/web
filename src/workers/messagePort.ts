// Under Jest, jsdom doesn't provide an implementation of MessagePort or
// or MessageChannel, so we have to provide a polyfill. This will be overridden
// by (the empty) `messagePort.webpack.ts` for the browser, so it's not shipped.

class MockMessagePort extends EventTarget {
  _target: EventTarget | null = null
  onmessage: ((x: MessageEvent) => void) | null = null
  onmessageerror: ((x: MessageEvent) => void) | null = null
  close() {}
  start() {}

  constructor() {
    super()
    this.addEventListener('message', (ev: Event) => {
      this.onmessage?.(ev as MessageEvent)
    })
  }
  postMessage(data: any) {
    // This can be useful when debugging worker communications flow.
    // console.debug("postMessage", data)
    const event = new MessageEvent('message', { data })
    this._target?.dispatchEvent(event)
  }
}

class MockMessageChannel {
  readonly port1 = new MockMessagePort()
  readonly port2 = new MockMessagePort()

  constructor() {
    this.port1._target = this.port2
    this.port2._target = this.port1
  }
}

// Don't clobber existing implementations.
globalThis.MessagePort ??= MockMessagePort
globalThis.MessageChannel ??= MockMessageChannel

export {}
