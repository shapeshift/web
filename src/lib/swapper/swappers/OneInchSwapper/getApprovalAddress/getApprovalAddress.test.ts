import { KnownChainIds } from '@shapeshiftoss/types'
import { Ok } from '@sniptt/monads'
import type { AxiosStatic } from 'axios'

import { oneInchService } from '../utils/oneInchService'
import { getApprovalAddress } from './getApprovalAddress'

jest.mock('../utils/oneInchService', () => {
  const axios: AxiosStatic = jest.createMockFromModule('axios')
  axios.create = jest.fn(() => axios)

  return {
    oneInchService: axios.create(),
  }
})

describe('getApprovalAddress', () => {
  const apiUrl = 'https://api.1inch.io/v5.0'

  it('returns the correct address for the given chainId', async () => {
    ;(oneInchService.get as jest.Mock<unknown>).mockReturnValueOnce(
      Promise.resolve(
        Ok({
          data: { address: '0x1111111254eeb25477b68fb85ed929f73a960583' },
        }),
      ),
    )
    const maybeApprovalAddress = await getApprovalAddress(apiUrl, KnownChainIds.EthereumMainnet)
    expect(maybeApprovalAddress.isOk()).toBe(true)
    expect(maybeApprovalAddress.unwrap()).toBe('0x1111111254eeb25477b68fb85ed929f73a960583')
  })

  it('returns undefined if chainId is not supported', async () => {
    ;(oneInchService.get as jest.Mock<unknown>).mockReturnValueOnce(
      Promise.resolve(
        Ok({
          data: {
            statusCode: 404,
            message: 'Cannot GET /v5.0/500/approve/spender',
            error: 'Not Found',
          },
        }),
      ),
    )
    const maybeApprovalAddress = await getApprovalAddress(
      apiUrl,
      KnownChainIds.BnbSmartChainMainnet,
    )
    expect(maybeApprovalAddress.isErr()).toBe(false)
    expect(maybeApprovalAddress.unwrap()).toBe(undefined)
  })
})
