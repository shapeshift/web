import { renderHook } from '@testing-library/react-hooks'

import { useAccountBalances } from './useAccountBalances'

jest.mock('context/WalletProvider/WalletProvider')

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
  network: 'ethereum',
  price: 3500,
  symbol: 'eth'
}

const mockRuneErc20 = {
  contractAddress: '0x3155ba85d5f96b2d030a4966af206230e46849cb',
  name: 'THORChain (ERC20)',
  network: 'ethereum',
  price: 10,
  symbol: 'rune'
}

const fooBarErc20 = {
  contractAddress: '0xfoobar',
  name: 'THORChain (ERC20)',
  network: 'ethereum',
  price: 12,
  symbol: 'rune'
}

const setup = ({ asset = {}, balances = {} }) => {
  return renderHook(() => useAccountBalances({ asset, balances }))
}

describe('useAccountBalances', () => {
  it('should return assetBalance and accountBalances for chain asset', () => {
    const { result } = setup({ asset: mockEth, balances: mockBalances })
    expect(result.current.assetBalance).toEqual(mockBalances.ethereum)

    const expectedCrypto = '0.05'
    const crypto = result.current.accountBalances.crypto.toString()
    expect(crypto).toBe(expectedCrypto)

    const expectedFiat = '175.00'
    const fiat = result.current.accountBalances.fiat.toFixed(2)
    expect(fiat).toBe(expectedFiat)
  })

  it('should return assetBalance and accountBalances for erc20', () => {
    const { result } = setup({ asset: mockRuneErc20, balances: mockBalances })
    expect(result.current.assetBalance).toEqual(
      mockBalances['0x3155ba85d5f96b2d030a4966af206230e46849cb']
    )

    const expectedCrypto = '21'
    const crypto = result.current.accountBalances.crypto.toString()
    expect(crypto).toBe(expectedCrypto)

    const expectedFiat = '210.00'
    const fiat = result.current.accountBalances.fiat.toFixed(2)
    expect(fiat).toBe(expectedFiat)
  })

  it('returns zeros for asset that is not available', () => {
    const { result } = setup({ asset: fooBarErc20, balances: mockBalances })
    expect(result.current.assetBalance).toBe(undefined)

    const expectedCrypto = '0'
    const crypto = result.current.accountBalances.crypto.toString()
    expect(crypto).toBe(expectedCrypto)

    const expectedFiat = '0.00'
    const fiat = result.current.accountBalances.fiat.toFixed(2)
    expect(fiat).toBe(expectedFiat)
  })
})
