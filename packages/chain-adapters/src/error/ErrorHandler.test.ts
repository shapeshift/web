import { describe, expect, it } from 'vitest'

import { ChainAdapterError, ErrorHandler } from './ErrorHandler'

const metadata = { translation: 'chainAdapters.errors.signMessage' }

describe('ErrorHandler', () => {
  it('includes the contents of a thrown non-Error object in the message', async () => {
    const failureEvent = {
      message_type: 'FAILURE',
      message_enum: 3,
      message: { code: 1, message: 'Malformed packet' },
      from_wallet: true,
    }

    const err = await ErrorHandler(failureEvent, metadata).catch(e => e)

    expect(err).toBeInstanceOf(ChainAdapterError)
    expect(err.message).toBe(`Unknown Error: ${JSON.stringify(failureEvent)}`)
    expect(err.metadata).toEqual(metadata)
  })

  it('falls back to String for a thrown object that cannot be serialized', async () => {
    const err = await ErrorHandler({ amount: 1n }, metadata).catch(e => e)

    expect(err).toBeInstanceOf(ChainAdapterError)
    expect(err.message).toBe('Unknown Error: [object Object]')
  })
})
