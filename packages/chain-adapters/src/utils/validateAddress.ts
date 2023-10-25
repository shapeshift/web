import axios from 'axios'

const TRM_LABS_API_URL = 'https://api.trmlabs.com/public/v1/sanctions/screening'

const cache: Record<string, Promise<boolean>> = {}

const _validateAddress = async (address: string): Promise<boolean> => {
  type trmResponse = [
    {
      address: string
      isSanctioned: boolean
    },
  ]

  const response = await axios.post<trmResponse>(
    TRM_LABS_API_URL,
    [
      {
        address,
      },
    ],
    {
      headers: {
        Accept: 'application/json',
      },
    },
  )

  return response.data[0].isSanctioned
}

export const validateAddress = async (address: string): Promise<void> => {
  // dedupe and cache promises in memory
  if (cache[address] === undefined) {
    const newEntry = _validateAddress(address)
    cache[address] = newEntry
  }

  const result = cache[address]
  if (await result) throw Error('Address not supported')
}
