import { ChainTypes, UtxoAccountType } from '@shapeshiftoss/types'
import { act, renderHook } from '@testing-library/react-hooks'
import * as reactRedux from 'react-redux'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { ethereum as mockEthereum } from 'jest/mocks/assets'

import { useBalances } from './useBalances'

jest.mock('context/WalletProvider/WalletProvider')
jest.mock('context/ChainAdaptersProvider/ChainAdaptersProvider')
jest.mock('lib/assetService', () => ({
  getAssetService: () =>
    Promise.resolve({
      byNetwork: () => [mockEthereum]
    })
}))

const balances = {
  network: 'ethereum',
  symbol: 'ETH',
  address: '0xMyWalletAddress',
  balance: '50000000000000000',
  unconfirmedBalance: '0',
  unconfirmedTxs: 0,
  txs: 198,
  tokens: [
    {
      type: 'ERC20',
      name: 'THORChain ETH.RUNE',
      contract: '0x3155BA85D5F96b2d030a4966AF206230e46849cb',
      transfers: 10,
      symbol: 'RUNE',
      decimals: 18,
      balance: '21000000000000000000'
    }
  ]
}

const wallet = {}

const setup = ({
  adapter = () => ({
    getType: () => ChainTypes.Ethereum,
    getAddress: () => Promise.resolve('0xMyWalletAddress'),
    getAccount: () => Promise.resolve(balances)
  })
}) => {
  ;(useWallet as jest.Mock<unknown>).mockImplementation(() => ({
    state: { wallet, walletInfo: { deviceId: 1 } },
    getPublicKeys: () => Promise.resolve()
  }))
  ;(useChainAdapters as jest.Mock<unknown>).mockImplementation(() => ({
    getSupportedAdapters: () => [adapter]
  }))
  return renderHook(() => useBalances())
}

describe('useBalances', () => {
  const useSelectorMock = jest.spyOn(reactRedux, 'useSelector')

  beforeAll(() => {
    useSelectorMock.mockReturnValue({
      state: {
        preferences: {
          accountTypes: {
            [ChainTypes.Bitcoin]: UtxoAccountType.SegwitP2sh
          }
        }
      }
    })
  })

  it('returns a users balances', async () => {
    await act(async () => {
      const { waitForValueToChange, result } = setup({})

      await waitForValueToChange(() => result.current.balances)

      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeUndefined()
      expect(result.current.balances).toEqual({ [ChainTypes.Ethereum]: balances })
    })
  })

  it('returns an error if requests fail', async () => {
    await act(async () => {
      const { waitForValueToChange, result } = setup({
        adapter: () => ({
          getType: () => ChainTypes.Ethereum,
          getAddress: () => Promise.reject('Error while getting address'),
          getAccount: () => Promise.reject('No balances for you')
        })
      })

      await waitForValueToChange(() => result.current.error)

      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe('Error while getting address')
    })
  })
})
