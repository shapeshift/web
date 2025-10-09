// Process.nextTick polyfill for GridPlus SDK and other Node.js dependencies
// GridPlus SDK uses cbor.encode() which relies on Node.js streams that call process.nextTick
// This polyfill must run before any code that uses process.nextTick
// Uses queueMicrotask for proper microtask scheduling (better than setTimeout)
;(function() {
  // Ensure global exists
  if (typeof globalThis !== 'undefined' && typeof global === 'undefined') {
    (globalThis as any).global = globalThis
  }

  // Preserve existing process.env from vite's define config
  const existingEnv = (typeof process !== 'undefined' && process.env) ? process.env : {}

  // Create process object if it doesn't exist
  if (typeof process === 'undefined') {
    (globalThis as any).process = { env: existingEnv, versions: {} }
  }

  // Add nextTick if missing
  if (!process.nextTick) {
    // Modern approach: direct queueMicrotask or Promise fallback
    // This provides proper microtask timing that Node.js code expects
    process.nextTick = function(callback: Function, ...args: any[]) {
      const fn = () => callback(...args)

      if (typeof queueMicrotask === 'function') {
        queueMicrotask(fn)
      } else {
        // Fallback for older browsers
        Promise.resolve().then(fn)
      }
    }
  }
})()

import '@formatjs/intl-getcanonicallocales/polyfill'
import '@formatjs/intl-locale/polyfill'
import '@formatjs/intl-numberformat/polyfill'
import '@formatjs/intl-numberformat/locale-data/ar'
import '@formatjs/intl-numberformat/locale-data/bn'
import '@formatjs/intl-numberformat/locale-data/da'
import '@formatjs/intl-numberformat/locale-data/de'
import '@formatjs/intl-numberformat/locale-data/en'
import '@formatjs/intl-numberformat/locale-data/es'
import '@formatjs/intl-numberformat/locale-data/fr'
import '@formatjs/intl-numberformat/locale-data/hi'
import '@formatjs/intl-numberformat/locale-data/it'
import '@formatjs/intl-numberformat/locale-data/id'
import '@formatjs/intl-numberformat/locale-data/ja'
import '@formatjs/intl-numberformat/locale-data/ko'
import '@formatjs/intl-numberformat/locale-data/ms'
import '@formatjs/intl-numberformat/locale-data/nb'
import '@formatjs/intl-numberformat/locale-data/nl'
import '@formatjs/intl-numberformat/locale-data/pl'
import '@formatjs/intl-numberformat/locale-data/pt'
import '@formatjs/intl-numberformat/locale-data/ru'
import '@formatjs/intl-numberformat/locale-data/sv'
import '@formatjs/intl-numberformat/locale-data/sr'
import '@formatjs/intl-numberformat/locale-data/sw'
import '@formatjs/intl-numberformat/locale-data/th'
import '@formatjs/intl-numberformat/locale-data/tr'
import '@formatjs/intl-numberformat/locale-data/uk'
import '@formatjs/intl-numberformat/locale-data/vi'
import '@formatjs/intl-numberformat/locale-data/zh'
import '@formatjs/intl-pluralrules/polyfill'
import '@formatjs/intl-pluralrules/locale-data/ar'
import '@formatjs/intl-pluralrules/locale-data/bn'
import '@formatjs/intl-pluralrules/locale-data/da'
import '@formatjs/intl-pluralrules/locale-data/de'
import '@formatjs/intl-pluralrules/locale-data/en'
import '@formatjs/intl-pluralrules/locale-data/es'
import '@formatjs/intl-pluralrules/locale-data/fr'
import '@formatjs/intl-pluralrules/locale-data/hi'
import '@formatjs/intl-pluralrules/locale-data/it'
import '@formatjs/intl-pluralrules/locale-data/id'
import '@formatjs/intl-pluralrules/locale-data/ja'
import '@formatjs/intl-pluralrules/locale-data/ko'
import '@formatjs/intl-pluralrules/locale-data/ms'
import '@formatjs/intl-pluralrules/locale-data/nb'
import '@formatjs/intl-pluralrules/locale-data/nl'
import '@formatjs/intl-pluralrules/locale-data/pl'
import '@formatjs/intl-pluralrules/locale-data/pt'
import '@formatjs/intl-pluralrules/locale-data/ru'
import '@formatjs/intl-pluralrules/locale-data/sv'
import '@formatjs/intl-pluralrules/locale-data/sr'
import '@formatjs/intl-pluralrules/locale-data/sw'
import '@formatjs/intl-pluralrules/locale-data/th'
import '@formatjs/intl-pluralrules/locale-data/tr'
import '@formatjs/intl-pluralrules/locale-data/uk'
import '@formatjs/intl-pluralrules/locale-data/vi'
import '@formatjs/intl-pluralrules/locale-data/zh'
