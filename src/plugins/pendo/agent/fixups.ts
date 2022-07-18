import { logger } from 'lib/logger'

import { filteredAjax } from './ajax'
import {
  PendoAjaxError,
  PendoFixupError,
  PendoGuideRequestError,
  PendoGuideResponseError,
} from './errors'
import { filterGuideTag } from './filters'
import type { FixupTable, PendoEnv } from './types'

const agentLogger = logger.child({ namespace: ['Plugin', 'Pendo', 'Agent'] })
const fixupLogger = logger.child({ namespace: ['Plugin', 'Pendo', 'Agent', 'Fixups'] })

export const fixupTables: Record<string, FixupTable> = Object.freeze({
  // Integrity value for the contents of the IIFE in v2.117.0_prod, no trailing newline
  'sha256-CIe1ebNh5QUBxPYMVZwwj7mnJnalruqUj6Wt7JSg3oM=': Object.freeze({
    fixups: {
      // Fixes a "SameSite" error where the agent attempts to write to document.cookie in order to clear cookies, even when cookies are disabled
      21400: '{document:{}}.',
      // Throws in a string escaping function which would otherwise stop escaping after recursion depth >= 200
      170827: 'pendoFixupHelpers.recursionDepth(),',
      // Throws if _.template() is used
      133301: 'pendoFixupHelpers.template();',
      // Throws when the agent tries to inject a script or iframe tag
      218098: 'pendoFixupHelpers.attemptedCodeInjection("includeScript",e);',
      79894: 'pendoFixupHelpers.attemptedCodeInjection("evalScript",e);',
      429345: 'pendoFixupHelpers.attemptedCodeInjection("loadResource",e,t);',
      19494: 'pendoFixupHelpers.attemptedCodeInjection("createPreviewBar");',
      1397: 'pendoFixupHelpers.attemptedCodeInjection("v",e,t,n);',
      // Don't disable SRI validation if the sniffer says the browser doesn't support it
      211752: 'true||',
      // Force use of pendo.ajax() for all fetches
      25119: 'false&&',
      25635: 'return pendo.ajax.get(e).then(function(){},function(){});',
      31143: 'false&&',
      31852: 'false&&',
      31999: 'true||',
      32206: 'false&&',
      32441: 'false&&',
      32562: 'true||',
      219353: 'return;',
      // Use filteredFetch for pendo.ajax().
      188619: `return n(pendoFixupHelpers.filteredAjax(t));`,
      // Use custom localStorage / sessionStorage implementations
      162288: 'return pendoFixupHelpers.localStorage;',
      162366: 'return pendoFixupHelpers.sessionStorage;',
      73870: 'pendoFixupHelpers.',
      188179: '.pendoFixupHelpers',
      425057: 'pendoFixupHelpers.',
      425114: 'pendoFixupHelpers.',
      187269: 'const localStorage=pendoFixupHelpers.localStorage;',
      // 187446: 'pendoFixupHelpers.',
      // 187765: 'pendoFixupHelpers.',
      // 188086: 'pendoFixupHelpers.',
      // Filter allowed guide elements and attributes to prevent code injection
      385198: 'if(!pendoFixupHelpers.filterGuideTag(e,t,n,i)){return false;}',
      // Remember compressed objects so the fetch filters can decode them
      171217: 'pendoFixupHelpers.compress(e,r);',
      // Force logging
      207591: 'return true;',
      // Use custom logger
      209392: 'return pendoFixupHelpers.log(e,t);',
      // Never try to load staging agent (it's identical)
      1114: 'return false;',
      // Unconditionally disable openXhrIntercept, which spies on all outgoing fetches.
      // This feature is also disabled by setting xhrTimings to false, but it's scary
      // so kill it with fire.
      225821: 'pendoFixupHelpers.openXhrIntercept();',
      // Export a couple of extra things for easier debugging.
      432605: 'pendo.ConfigReader=ConfigReader;pendo.GuideLoader=GuideLoader;',
      // Use cookieStorage instead of actual cookies
      186406: 'return pendoFixupHelpers.cookieStorage.getItem(e);',
      186634: 'return pendoFixupHelpers.cookieStorage.setItem(e,t);',
      21349: 'return pendoFixupHelpers.cookieStorage.removeItem(e);',
    },
    makeFixupHelpers: (env: PendoEnv) =>
      Object.freeze({
        stringEscapeRecursionDepth() {
          fixupLogger[env.sealed ? 'error' : 'warn'](
            { fn: 'stringEscapeRecursionDepth' },
            'string escape recursion depth exceeded',
          )
          if (env.sealed) throw new PendoFixupError('stringEscapeRecursionDepth')
        },
        template() {
          fixupLogger[env.sealed ? 'error' : 'warn'](
            { fn: 'template' },
            '_.template() is forbidden',
          )
          if (env.sealed) throw new PendoFixupError('template')
        },
        attemptedCodeInjection(location: string, ...args: unknown[]) {
          fixupLogger[env.sealed ? 'error' : 'warn'](
            { fn: 'attemptedCodeInjection', location, args },
            'attempted code injection',
          )
          if (env.sealed) throw new PendoFixupError('attemptedCodeInjection')
        },
        openXhrIntercept() {
          fixupLogger[env.sealed ? 'error' : 'warn'](
            { fn: 'openXhrIntercept' },
            'attempted to intercept XHR',
          )
          if (env.sealed) throw new PendoFixupError('openXhrIntercept')
        },
        compress(obj: object, compressed: string) {
          env.compressMap.set(compressed, obj)
          setTimeout(() => env.compressMap.delete(compressed), 0)
        },
        cookieStorage: env.cookieStorageWrapper,
        localStorage: env.sealed ? env.localStorageWrapper : window.localStorage,
        sessionStorage: env.sealed ? env.sessionStorageWrapper : window.sessionStorage,
        filterGuideTag(attributes: Record<string, string>, tagName: string): boolean {
          const result = (() => {
            try {
              filterGuideTag.call(env, tagName, attributes)
            } catch (e) {
              return e
            }
          })()
          if (result) {
            fixupLogger[env.sealed ? 'error' : 'warn'](
              result,
              { fn: 'filterGuideTag', tagName, attributes },
              'guide tag did not pass filter',
            )
            if (env.sealed) throw new PendoFixupError('openXhrInfilterGuideTagtercept')
          }
          return true
        },
        filteredAjax(params: Parameters<typeof filteredAjax>[0]) {
          try {
            return filteredAjax.call(env, params)
          } catch (e) {
            // No need to re-log our custom errors
            if (
              !(
                e instanceof PendoAjaxError ||
                e instanceof PendoGuideRequestError ||
                e instanceof PendoGuideResponseError
              )
            ) {
              fixupLogger.error(e, { fn: 'filteredAjax' }, 'error filtering ajax request')
            }
            throw new PendoFixupError('filteredAjax')
          }
        },
        log(msg: string, prefix: string) {
          if (prefix) {
            agentLogger.trace({ prefix: prefix.replace(/^\[([^\]]*)\] /, '$1') }, msg)
          } else {
            agentLogger.trace(msg)
          }
        },
      }),
  }),
})
