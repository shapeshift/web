import * as crypto from 'crypto'
import * as util from 'util'

import { parseAgent } from './parse'

// Poor-man's polyfill b/c jsdom is kinda lame
Object.defineProperty(window, 'crypto', {
  value: {
    async getRandomValues(x: Uint8Array) {
      return await util.promisify(crypto.randomFill)(x)
    },
  },
})

// No idea why we need this nonsens, but whatever Blob polyfill jsdom is using
// doesn't have .text() or anything similar
function readBlobAsText(x: Blob): Promise<string> {
  return new Promise(resolve => {
    const fileReader = new FileReader()
    fileReader.onloadend = () => {
      resolve(fileReader.result as string)
    }
    fileReader.readAsText(x)
  })
}

// Defined at the root level entirely to make the lack of indentation on multiline
// string literals look less strange
const input = `// Pendo Agent Wrapper
// Environment:    production
// Agent Version:  1234
// Installed:      1970-01-01T00:00:00Z
(function (PendoConfig) {
foobar
})({
  foo: "bar",
  bar: "baz"
});`

const output = `// Pendo Agent Wrapper
// Environment:    production
// Agent Version:  1234
// Installed:      1970-01-01T00:00:00Z
(function (PendoConfig) {
foobazbar
})(pendoEnv.PendoConfig);`

describe('parseAgent', () => {
  it('works', async () => {
    // Oh, look, jsdom sucks again
    const blobPromise = new Promise<Blob>(resolve => {
      Object.defineProperty(URL, 'createObjectURL', {
        value: (x: Blob) => {
          resolve(x)
          return `blob:foobar`
        },
      })
    })

    const makeFixupHelpers = () => ({})
    const result = await parseAgent(
      input,
      { apiKey: 'foobar', baz: 'bash' },
      {
        'sha256-w6uP8Tcg6K2QR905Rms8iXTlksL6OD1KOWBxTK7wxPI=': {
          fixups: {
            3: 'baz',
          },
          makeFixupHelpers,
        },
      },
    )
    expect(result.PendoConfig).toMatchObject({
      apiKey: 'foobar',
      bar: 'baz',
      baz: 'bash',
      foo: 'bar',
    })
    expect(result.integrity).toEqual('sha256-LgG3foY4j+rqLqKN3sjc4mtT43UQORGy7+j0HcnWcq8=')
    expect(result.makeFixupHelpers).toStrictEqual(makeFixupHelpers)
    expect(result.src).toEqual('blob:foobar')
    expect(await readBlobAsText(await blobPromise)).toEqual(output)
  })
})
