import axios from 'axios'

const ADDRESS_VALIDATION_URL = 'https://api.proxy.shapeshift.com/api/v1/validate'

const cache: Record<string, Promise<boolean>> = {}

const checkIsSanctioned = async (address: string): Promise<boolean> => {
  type validationResponse = {
    valid: boolean
  }

  const response = await axios.get<validationResponse>(`${ADDRESS_VALIDATION_URL}/${address}`)
  return response.data.valid
}

export const assertAddressNotSanctioned = async (address: string): Promise<void> => {
  // dedupe and cache promises in memory
  if (cache[address] === undefined) {
    const newEntry = checkIsSanctioned(address)
    cache[address] = newEntry
  }

  const isValidPromise = cache[address]
  const isValid = await isValidPromise
  if (!isValid) throw Error('Address not supported')
}
