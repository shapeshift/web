import { BalanceResponse, NetworkTypes } from '@shapeshiftoss/types'

import { flattenTokenBalances } from './useFlattenedBalances'

jest.mock('context/WalletProvider/WalletProvider')
jest.mock('context/ChainAdaptersProvider/ChainAdaptersProvider')

const balances: Record<string, BalanceResponse> = {
  ethereum: {
    network: NetworkTypes.MAINNET,
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
}

describe('flattenTokenBalances', () => {
  it('flattens a token list associated with a chain', () => {
    const result = flattenTokenBalances(balances)
    const expected = {
      ethereum: {
        network: NetworkTypes.MAINNET,
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
    expect(result).toEqual(expected)
  })

  it('does nothing if a chain has no tokens', () => {
    const result = flattenTokenBalances({ ethereum: { ...balances.ethereum, tokens: [] } })
    const expected = {
      ethereum: {
        network: NetworkTypes.MAINNET,
        symbol: 'ETH',
        address: '0xMyWalletAddress',
        balance: '50000000000000000',
        unconfirmedBalance: '0',
        unconfirmedTxs: 0,
        txs: 198,
        tokens: []
      }
    }
    expect(result).toEqual(expected)
  })
})
