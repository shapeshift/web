import { Asset, ChainTypes } from '@shapeshiftoss/types'
import { act, renderHook } from '@testing-library/react-hooks'
import { useGetAssetData } from 'hooks/useAsset/useAsset'
import { TestProviders } from 'jest/TestProviders'

import { useAccountBalances } from './useAccountBalances'

jest.mock('context/WalletProvider/WalletProvider')
jest.mock('hooks/useAsset/useAsset')

const mockBalances = {
  ethereum: {
    network: 'ethereum',
    symbol: 'ETH',
    address: '0x0000000000000000000000000000000000000000',
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
  },
  '0x3155ba85d5f96b2d030a4966af206230e46849cb': {
    type: 'ERC20',
    name: 'THORChain ETH.RUNE',
    contract: '0x3155BA85D5F96b2d030a4966AF206230e46849cb',
    transfers: 10,
    symbol: 'RUNE',
    decimals: 18,
    balance: '21000000000000000000'
  }
}

const mockEth = {
  name: 'Ethereum',
  chain: ChainTypes.Ethereum,
  symbol: 'ETH',
  precision: 18
}

const mockRuneErc20 = {
  tokenId: '0x3155ba85d5f96b2d030a4966af206230e46849cb',
  name: 'THORChain (ERC20)',
  chain: ChainTypes.Ethereum,
  symbol: 'RUNE',
  precision: 18
}

const fooBarErc20 = {
  tokenId: '0xfoobar',
  name: 'THORChain (ERC20)',
  chain: 'ethereum',
  symbol: 'FOOBAR',
  precision: 18
}

const getAssetData = () =>
  Promise.resolve({
    name: 'Ethereum',
    chain: ChainTypes.Ethereum,
    price: '3500',
    symbol: 'ETH'
  })

const setup = ({ asset = {} as Asset, balances = {} }: { asset: Asset; balances: any }) => {
  ;(useGetAssetData as jest.Mock<unknown>).mockImplementation(() => getAssetData)
  const wrapper: React.FC = ({ children }) => {
    return <TestProviders>{children}</TestProviders>
  }
  return renderHook(() => useAccountBalances({ asset, balances }), { wrapper })
}

describe('useAccountBalances', () => {
  it('should return assetBalance and accountBalances for chain asset', async () => {
    await act(async () => {
      const hook = setup({
        asset: mockEth as unknown as Asset,
        balances: mockBalances
      })
      const { waitForNextUpdate, result } = hook
      await waitForNextUpdate()

      expect(result.current.assetBalance).toEqual(mockBalances.ethereum)

      const expectedCrypto = '0.05'
      const crypto = result.current.accountBalances.crypto.toString()
      expect(crypto).toBe(expectedCrypto)

      const expectedFiat = '175.00'
      const fiat = result.current.accountBalances.fiat.toFixed(2)
      expect(fiat).toBe(expectedFiat)
    })
  })

  it('should return assetBalance and accountBalances for erc20', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = setup({
        asset: mockRuneErc20 as unknown as Asset,
        balances: mockBalances
      })
      expect(result.current.assetBalance).toEqual(
        mockBalances['0x3155ba85d5f96b2d030a4966af206230e46849cb']
      )

      await waitForNextUpdate()

      const expectedCrypto = '21'
      const crypto = result.current.accountBalances.crypto.toString()
      expect(crypto).toBe(expectedCrypto)

      const expectedFiat = '73500.00'
      const fiat = result.current.accountBalances.fiat.toFixed(2)
      expect(fiat).toBe(expectedFiat)
    })
  })

  it('returns zeros for asset that is not available', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = setup({
        asset: fooBarErc20 as unknown as Asset,
        balances: mockBalances
      })
      expect(result.current.assetBalance).toBe(undefined)

      await waitForNextUpdate()

      const expectedCrypto = '0'
      const crypto = result.current.accountBalances.crypto.toString()
      expect(crypto).toBe(expectedCrypto)

      const expectedFiat = '0.00'
      const fiat = result.current.accountBalances.fiat.toFixed(2)
      expect(fiat).toBe(expectedFiat)
    })
  })
})
