import { ethAssetId, foxAssetId, optimismAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { AxiosStatic } from 'axios'
import { DAO_TREASURY_ETHEREUM_MAINNET, DAO_TREASURY_OPTIMISM } from 'constants/treasury'

import { getTreasuryAddressForReceiveAsset } from './helpers'

jest.mock('lib/swapper/swappers/ZrxSwapper/utils/zrxService', () => {
  const axios: AxiosStatic = jest.createMockFromModule('axios')
  axios.create = jest.fn(() => axios)

  return {
    zrxServiceFactory: () => axios.create(),
  }
})

describe('utils', () => {
  describe('getTreasuryAddressForReceiveAsset', () => {
    it('gets the treasury address for an ERC20 asset', () => {
      const treasuryAddress = getTreasuryAddressForReceiveAsset(foxAssetId)
      expect(treasuryAddress).toStrictEqual(DAO_TREASURY_ETHEREUM_MAINNET)
    })

    it('gets the treasury address for ETH asset', () => {
      const treasuryAddress = getTreasuryAddressForReceiveAsset(ethAssetId)
      expect(treasuryAddress).toStrictEqual(DAO_TREASURY_ETHEREUM_MAINNET)
    })

    it('gets the treasury address for Optimism asset', () => {
      const treasuryAddress = getTreasuryAddressForReceiveAsset(optimismAssetId)
      expect(treasuryAddress).toStrictEqual(DAO_TREASURY_OPTIMISM)
    })

    it('throws for unsupported chains', () => {
      expect(() => getTreasuryAddressForReceiveAsset(thorchainAssetId)).toThrow(
        '[getTreasuryAddressForReceiveAsset] - Unsupported chainId',
      )
    })
  })
})
