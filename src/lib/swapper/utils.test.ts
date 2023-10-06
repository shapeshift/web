import axios from 'axios'
import { getConfig } from 'config'

import { isValidSwapAddress } from './utils'

jest.mock('axios')
const mockAxios = axios as jest.Mocked<typeof axios>

describe('isValidSwapAddress', () => {
  const badAddressUrl = `${
    getConfig().REACT_APP_CHAINALYSIS_API_URL
  }/address/0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef`
  const goodAddressUrl = `${
    getConfig().REACT_APP_CHAINALYSIS_API_URL
  }/address/0x1234567890123456789012345678901234567890`

  mockAxios.get.mockImplementation(async url => {
    switch (url) {
      case badAddressUrl:
        return await Promise.resolve({
          identifications: [
            {
              category: '?',
              name: 'FAKE',
              description:
                'This specific address 0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef within the cluster has been identified as belonging to an individual on list',
              url: 'https://home.treasury.gov/policy-issues/financial-sanctions/recent-actions/20200916',
            },
          ],
        })
      case goodAddressUrl:
        return Promise.resolve({
          identifications: [],
        })
      default:
        return await Promise.resolve({})
    }
  })

  it('returns true for a valid address', async () => {
    const validAddress = '0x1234567890123456789012345678901234567890'
    const result = await isValidSwapAddress(validAddress)
    expect(result).toBe(true)
  })

  it('returns false for a bad address', async () => {
    const badAddress = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
    const result = await isValidSwapAddress(badAddress)
    expect(result).toBe(false)
  })
})
