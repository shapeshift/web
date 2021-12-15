import { chainAdapters, ChainTypes, UtxoAccountType } from '@shapeshiftoss/types'
import { act, renderHook } from '@testing-library/react-hooks'
import * as reactRedux from 'react-redux'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'

import { Balances, useBalances } from './useBalances'

jest.mock('context/WalletProvider/WalletProvider')
jest.mock('context/ChainAdaptersProvider/ChainAdaptersProvider')

const ethCaip2 = 'eip155:1'
const ethCaip19 = 'eip155:1/slip44:60'
const runeCaip19 = 'eip155:1/erc20:0x3155ba85d5f96b2d030a4966af206230e46849cb'

const account: chainAdapters.Account<ChainTypes.Ethereum> = {
  chain: ChainTypes.Ethereum,
  pubkey: '0xMyWalletAddress',
  balance: '50000000000000000',
  caip2: ethCaip2,
  caip19: ethCaip19,
  chainSpecific: {
    nonce: 0,
    tokens: [{ caip19: runeCaip19, balance: '21000000000000000000' }]
  }
}

const balances: Balances = {
  [ethCaip19]: {
    chain: ChainTypes.Ethereum,
    caip2: ethCaip2,
    caip19: ethCaip19,
    pubkey: '0xMyWalletAddress',
    balance: '50000000000000000',
    chainSpecific: {
      nonce: 0,
      tokens: [{ caip19: runeCaip19, balance: '21000000000000000000' }]
    }
  },
  [runeCaip19]: {
    chain: ChainTypes.Ethereum,
    caip2: ethCaip2,
    caip19: runeCaip19,
    pubkey: '0xMyWalletAddress',
    balance: '21000000000000000000',
    chainSpecific: {
      nonce: 0,
      tokens: [{ caip19: runeCaip19, balance: '21000000000000000000' }]
    }
  }
}

const wallet = {
  _supportsETH: true,
  _supportsBTC: true
}

const setup = ({
  adapter = () => ({
    getCaip2: () => Promise.resolve(ethCaip2),
    getType: () => ChainTypes.Ethereum,
    getAddress: () => Promise.resolve('0xMyWalletAddress'),
    getAccount: () => Promise.resolve(account)
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
      expect(result.current.balances).toEqual(balances)
    })
  })

  it('returns an error if requests fail', async () => {
    await act(async () => {
      const { waitForValueToChange, result } = setup({
        adapter: () => ({
          getCaip2: () => Promise.resolve(ethCaip2),
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
