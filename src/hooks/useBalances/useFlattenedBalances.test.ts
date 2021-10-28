import { chainAdapters, ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'

import { flattenTokenBalances } from './useFlattenedBalances'

jest.mock('context/WalletProvider/WalletProvider')
jest.mock('context/ChainAdaptersProvider/ChainAdaptersProvider')

const balances: Record<string, chainAdapters.Account<ChainTypes.Ethereum>> = {
  [ChainTypes.Ethereum]: {
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
    symbol: 'ETH',
    pubkey: '0xMyWalletAddress',
    balance: '50000000000000000',
    chainSpecific: {
      nonce: 0,
      tokens: [
        {
          contractType: ContractTypes.ERC20,
          name: 'THORChain ETH.RUNE',
          contract: '0x3155BA85D5F96b2d030a4966AF206230e46849cb',
          symbol: 'RUNE',
          precision: 18,
          balance: '21000000000000000000'
        }
      ]
    }
  }
}

describe('flattenTokenBalances', () => {
  it('flattens a token list associated with a chain', () => {
    const result = flattenTokenBalances(balances)
    const expected: ReturnType<typeof flattenTokenBalances> = {
      [ChainTypes.Ethereum]: {
        chain: ChainTypes.Ethereum,
        network: NetworkTypes.MAINNET,
        symbol: 'ETH',
        pubkey: '0xMyWalletAddress',
        balance: '50000000000000000',
        chainSpecific: {
          nonce: 0,
          tokens: [
            {
              contractType: ContractTypes.ERC20,
              name: 'THORChain ETH.RUNE',
              contract: '0x3155BA85D5F96b2d030a4966AF206230e46849cb',
              symbol: 'RUNE',
              precision: 18,
              balance: '21000000000000000000'
            }
          ]
        }
      },
      '0x3155ba85d5f96b2d030a4966af206230e46849cb': {
        contractType: ContractTypes.ERC20,
        chain: ChainTypes.Ethereum,
        name: 'THORChain ETH.RUNE',
        contract: '0x3155BA85D5F96b2d030a4966AF206230e46849cb',
        symbol: 'RUNE',
        precision: 18,
        balance: '21000000000000000000'
      }
    }
    expect(result).toEqual(expected)
  })

  it('does nothing if a chain has no tokens', () => {
    const result = flattenTokenBalances({
      ethereum: { ...balances.ethereum, chainSpecific: { nonce: 0, tokens: [] } }
    })
    const expected = {
      [ChainTypes.Ethereum]: {
        chain: ChainTypes.Ethereum,
        network: NetworkTypes.MAINNET,
        symbol: 'ETH',
        pubkey: '0xMyWalletAddress',
        balance: '50000000000000000',
        chainSpecific: {
          nonce: 0,
          tokens: []
        }
      }
    }
    expect(result).toEqual(expected)
  })
})
