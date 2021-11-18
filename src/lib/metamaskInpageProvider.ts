/// <reference path="./metamaskInpageProvider.d.ts" />

import { initProvider } from 'metamask-inpage-provider'
import PostMessageStream from 'post-message-stream'

function universalProxy(pseudoTarget: object) {
  return {
    proxy: new Proxy(
      {},
      new Proxy(
        {},
        {
          get(_, p) {
            return (_t: any, p2: any, r: any) => {
              switch (p) {
                case 'get': {
                  const out = Reflect.get(pseudoTarget, p2, r)
                  if (typeof out === 'function') return out.bind(pseudoTarget)
                  return out
                }
                case 'getOwnPropertyDescriptor': {
                  const out = Reflect.getOwnPropertyDescriptor(pseudoTarget, p2)
                  if (out) out.configurable = true
                  return out
                }
                case 'isExtensible':
                  return true
                case 'preventExtensions':
                  return false
                default:
                  return (Reflect as any)[p](pseudoTarget, p2, r)
              }
            }
          }
        }
      )
    ),
    getPseudoTarget() {
      return pseudoTarget
    },
    setPseudoTarget(value: object) {
      pseudoTarget = value
    }
  }
}

if (typeof window !== 'undefined') {
  const initialPseudoTarget = Object.freeze({})
  const { proxy, getPseudoTarget, setPseudoTarget } = universalProxy(
    window.ethereum ?? initialPseudoTarget
  )
  try {
    Object.defineProperty(window, 'ethereum', {
      configurable: true,
      enumerable: true,
      get() {
        return proxy
      },
      set(value: unknown) {
        if (!(value && ['object', 'function'].includes(typeof value))) throw new TypeError()
        setPseudoTarget(value as object)
      }
    })

    // Allow MM time to try to sucessfully execute its own injected stub
    setTimeout(() => {
      try {
        // Don't clobber an existing MM stub
        if (getPseudoTarget() !== initialPseudoTarget) {
          console.info('metamaskInpageProvider: MM stub was already injected')
          return
        }
        initProvider({
          connectionStream: new PostMessageStream({
            name: 'inpage',
            target: 'contentscript'
          })
        })
        if (window.ethereum.isMetaMask) {
          console.info('metamaskInpageProvider: injected MM stub')
        } else {
          console.info(
            'metamaskInpageProvider: MM stub injection failed:',
            window.ethereum,
            getPseudoTarget()
          )
        }
      } catch (e) {
        console.error('metamaskInpageProvider callback:', e)
      } finally {
        Object.defineProperty(window, 'ethereum', {
          configurable: true,
          enumerable: true,
          writable: true,
          value: getPseudoTarget()
        })
        console.info('metamaskInpageProvider: window.ethereum proxy reset')
      }
    }, 0)
  } catch (e) {
    console.error('metamaskInpageProvider:', e)
  }
}
