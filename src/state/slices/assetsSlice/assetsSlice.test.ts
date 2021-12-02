import { caip19 } from '@shapeshiftoss/caip'
import { Asset, ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'
import { rune, zero } from 'jest/mocks/assets'
import { getAssetService } from 'lib/assetService'
import { store } from 'state/store'

import { fetchAsset } from './assetsSlice'

jest.mock('lib/assetService', () => ({
  service: {
    byTokenId: jest.fn(),
    description: jest.fn()
  },
  getAssetService: jest.fn()
}))

const setup = ({
  assetData,
  description
}: {
  assetData: Asset | undefined
  description: string | null
}) => {
  ;(getAssetService as unknown as jest.Mock<unknown>).mockImplementation(() => ({
    byTokenId: jest.fn().mockImplementation(() => assetData),
    description: jest.fn().mockImplementation(() => description)
  }))
}

describe('assetsSlice', () => {
  it('returns empty object for initialState', async () => {
    expect(store.getState().assets.byId).toEqual({})
    expect(store.getState().assets.ids).toEqual([])
  })

  describe('fetchAsset', () => {
    const chain = ChainTypes.Ethereum
    const network = NetworkTypes.MAINNET
    const contractType = ContractTypes.ERC20
    const tokenId = rune.tokenId
    const runeCAIP19 = caip19.toCAIP19({ chain, network, contractType, tokenId })

    it('does not update state if assetData does not exist', async () => {
      setup({ assetData: undefined, description: null })
      expect(store.getState().assets.byId[rune.tokenId as string]).toBeFalsy()
      await store.dispatch(fetchAsset(runeCAIP19))
      expect(store.getState().assets.byId[rune.tokenId as string]).toBeFalsy()
    })

    it('updates state if assetData exists but description does not', async () => {
      setup({ assetData: rune, description: null })
      expect(store.getState().assets.byId[rune.tokenId as string]).toBeFalsy()
      await store.dispatch(fetchAsset(runeCAIP19))
      expect(store.getState().assets.byId[runeCAIP19]).toBeTruthy()
      expect(store.getState().assets.ids.includes(runeCAIP19)).toBeTruthy()
    })

    it('updates state if assetData & description exists', async () => {
      const runeDescription =
        'THORChain is building a chain-agnostic bridging protocol that will allow trustless and secure value-transfer connections with most other chains (such as Bitcoin, Ethereum, Monero and all of Binance Chain). Users will be able to instantly swap any asset at fair market prices and deep liquidity. Token holders will be able to stake any asset and earn on liquidity fees. Projects will be able to access manipulation resistant price feeds and accept payments in any currencies, no matter the type or liquidity.'
      setup({ assetData: rune, description: runeDescription })
      await store.dispatch(fetchAsset(runeCAIP19))
      expect(store.getState().assets.byId[runeCAIP19]).toBeTruthy()
      expect(store.getState().assets.ids.includes(runeCAIP19)).toBeTruthy()
      expect(store.getState().assets.byId[runeCAIP19].description).toEqual(runeDescription)
    })

    it('does not update state if error is thrown', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation()
      ;(getAssetService as unknown as jest.Mock<unknown>).mockImplementation(() => ({
        byTokenId: jest.fn().mockImplementation(() => {
          throw new Error('Mock Network error: Something went wrong')
        }),
        description: jest.fn().mockImplementation(() => {
          throw new Error('Mock Network error: Something went wrong')
        })
      }))

      const { tokenId } = zero
      const zeroCAIP19 = caip19.toCAIP19({ chain, network, contractType, tokenId })

      expect(store.getState().assets.byId[zeroCAIP19]).toBeFalsy()
      await store.dispatch(fetchAsset(zeroCAIP19))
      expect(store.getState().assets.byId[zeroCAIP19]).toBeFalsy()
      expect(console.error).toBeCalled()
      consoleError.mockRestore()
    })
  })
})
