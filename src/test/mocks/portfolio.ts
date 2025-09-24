import {
  arbitrumAssetId,
  arbitrumNovaAssetId,
  avalancheAssetId,
  baseAssetId,
  bscAssetId,
  btcAssetId,
  cosmosAssetId,
  ethAssetId,
  mayachainAssetId,
  optimismAssetId,
  polygonAssetId,
  solAssetId,
  thorchainAssetId,
} from '@shapeshiftoss/caip'
import type { Account } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { PublicKey } from '@solana/web3.js'
import WAValidator from 'multicoin-address-validator'
import { isAddress } from 'viem'

import { accountToPortfolio } from '@/state/slices/portfolioSlice/utils'

// Import chain ID helpers (simplified versions)
const chainIdToChainLabel = (chainId: string) => {
  if (chainId.includes('bitcoin')) return 'bitcoin'
  if (chainId.includes('litecoin')) return 'litecoin'
  if (chainId.includes('dogecoin')) return 'dogecoin'
  if (chainId.includes('bitcoincash')) return 'bitcoincash'
  return 'bitcoin' // default fallback
}

type MockChainIds =
  | KnownChainIds.EthereumMainnet
  | KnownChainIds.BitcoinMainnet
  | KnownChainIds.CosmosMainnet

// Creates a mock portfolio
export const mockUpsertPortfolio = (accounts: Account<MockChainIds>[], assetIds: string[]) => {
  const portfolioAccounts = accounts.reduce(
    (
      acc: {
        [k: string]: Account<MockChainIds>
      },
      account: Account<MockChainIds>,
    ) => {
      acc[account.pubkey] = account
      return acc
    },
    {},
  )

  return accountToPortfolio({ portfolioAccounts, assetIds })
}

// Real chain adapter validation implementations
const validateBitcoinAddress = (address: string, chainId: string) => {
  const chainLabel = chainIdToChainLabel(chainId)
  const isValidAddress = WAValidator.validate(address, chainLabel)
  return { valid: isValidAddress }
}

const validateEthereumAddress = (address: string) => {
  const isValidAddress = isAddress(address)
  return { valid: isValidAddress }
}

const validateSolanaAddress = (address: string) => {
  try {
    new PublicKey(address)
    return { valid: true }
  } catch (err) {
    return { valid: false }
  }
}

export const mockChainAdapters = new Map([
  [
    KnownChainIds.BitcoinMainnet,
    {
      getFeeAssetId: () => btcAssetId,
      getDisplayName: () => 'Bitcoin',
      validateAddress: (address: string) =>
        validateBitcoinAddress(address, KnownChainIds.BitcoinMainnet),
    },
  ],
  [
    KnownChainIds.CosmosMainnet,
    {
      getFeeAssetId: () => cosmosAssetId,
      getDisplayName: () => 'Cosmos',
      // Cosmos adapter not easily available, use simple validation
      validateAddress: (address: string) => ({ valid: address.startsWith('cosmos') }),
    },
  ],
  [
    KnownChainIds.EthereumMainnet,
    {
      getFeeAssetId: () => ethAssetId,
      getDisplayName: () => 'Ethereum',
      validateAddress: validateEthereumAddress,
    },
  ],
  [
    KnownChainIds.AvalancheMainnet,
    {
      getFeeAssetId: () => avalancheAssetId,
      getDisplayName: () => 'Avalanche',
      validateAddress: validateEthereumAddress,
    },
  ],
  [
    KnownChainIds.OptimismMainnet,
    {
      getFeeAssetId: () => optimismAssetId,
      getDisplayName: () => 'Optimism',
      validateAddress: validateEthereumAddress,
    },
  ],
  [
    KnownChainIds.BnbSmartChainMainnet,
    {
      getFeeAssetId: () => bscAssetId,
      getDisplayName: () => 'Binance Smart Chain',
      validateAddress: validateEthereumAddress,
    },
  ],
  [
    KnownChainIds.PolygonMainnet,
    {
      getFeeAssetId: () => polygonAssetId,
      getDisplayName: () => 'Polygon',
      validateAddress: validateEthereumAddress,
    },
  ],
  [
    KnownChainIds.ArbitrumMainnet,
    {
      getFeeAssetId: () => arbitrumAssetId,
      getDisplayName: () => 'Arbitrum One',
      validateAddress: validateEthereumAddress,
    },
  ],
  [
    KnownChainIds.ArbitrumNovaMainnet,
    {
      getFeeAssetId: () => arbitrumNovaAssetId,
      getDisplayName: () => 'Arbitrum Nova',
      validateAddress: validateEthereumAddress,
    },
  ],
  [
    KnownChainIds.BaseMainnet,
    {
      getFeeAssetId: () => baseAssetId,
      getDisplayName: () => 'Base',
      validateAddress: validateEthereumAddress,
    },
  ],
  [
    KnownChainIds.ThorchainMainnet,
    {
      getFeeAssetId: () => thorchainAssetId,
      getDisplayName: () => 'Thorchain',
      validateAddress: (address: string) => {
        const THORCHAIN_PREFIX = 'thor'

        try {
          const bech32 = require('bech32')
          const decoded = bech32.decode(address)
          if (decoded.prefix !== THORCHAIN_PREFIX) {
            return { valid: false }
          }

          const wordsLength = decoded.words.length
          if (wordsLength !== 32) {
            return { valid: false }
          }
          return { valid: true }
        } catch (e) {
          return { valid: false }
        }
      },
    },
  ],
  [
    KnownChainIds.MayachainMainnet,
    {
      getFeeAssetId: () => mayachainAssetId,
      getDisplayName: () => 'Mayachain',
      validateAddress: (address: string) => ({ valid: address.startsWith('maya') }),
    },
  ],
  [
    KnownChainIds.SolanaMainnet,
    {
      getFeeAssetId: () => solAssetId,
      getDisplayName: () => 'Solana',
      validateAddress: validateSolanaAddress,
    },
  ],
])
