import axios from 'axios'

import { ChainAdapterError } from '../error/ErrorHandler'

const ADDRESS_VALIDATION_URL = 'https://api.proxy.shapeshift.com/api/v1/validate'

export const assertAddressNotSanctioned = async (address: string): Promise<void> => {
  const valid = await (async () => {
    try {
      const { data } = await axios.get<{ valid: boolean }>(`${ADDRESS_VALIDATION_URL}/${address}`)
      return data.valid
    } catch (err) {
      // Log the error for debugging purposes
      console.error(`Error validating address: ${address}. Defaulting to valid.`, err)
      return true
    }
  })()

  if (!valid)
    throw new ChainAdapterError(`Address ${address} not supported`, {
      translation: 'chainAdapters.errors.unsupportedAddress',
      options: { address },
    })
}
