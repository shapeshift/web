import {
  arbitrumAssetId,
  arbitrumNovaAssetId,
  avalancheAssetId,
  baseAssetId,
  bscAssetId,
  btcAssetId,
  cosmosAssetId,
  ethAssetId,
  optimismAssetId,
  polygonAssetId,
  thorchainAssetId,
} from '@shapeshiftoss/caip'
import type { Account } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { accountToPortfolio } from 'state/slices/portfolioSlice/utils'

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

  return accountToPortfolio({ portfolioAccounts, assetIds, nftCollectionsById: {} })
}

export const mockChainAdapters = new Map([
  [
    KnownChainIds.BitcoinMainnet,
    {
      getFeeAssetId: () => btcAssetId,
      getDisplayName: () => 'Bitcoin',
    },
  ],
  [
    KnownChainIds.CosmosMainnet,
    {
      getFeeAssetId: () => cosmosAssetId,
      getDisplayName: () => 'Cosmos',
    },
  ],
  [
    KnownChainIds.EthereumMainnet,
    {
      getFeeAssetId: () => ethAssetId,
      getDisplayName: () => 'Ethereum',
    },
  ],
  [
    KnownChainIds.AvalancheMainnet,
    {
      getFeeAssetId: () => avalancheAssetId,
      getDisplayName: () => 'Avalanche',
    },
  ],
  [
    KnownChainIds.OptimismMainnet,
    {
      getFeeAssetId: () => optimismAssetId,
      getDisplayName: () => 'Optimism',
    },
  ],
  [
    KnownChainIds.BnbSmartChainMainnet,
    {
      getFeeAssetId: () => bscAssetId,
      getDisplayName: () => 'Binance Smart Chain',
    },
  ],
  [
    KnownChainIds.PolygonMainnet,
    {
      getFeeAssetId: () => polygonAssetId,
      getDisplayName: () => 'Polygon',
    },
  ],
  [
    KnownChainIds.ArbitrumMainnet,
    {
      getFeeAssetId: () => arbitrumAssetId,
      getDisplayName: () => 'Arbitrum One',
    },
  ],
  [
    KnownChainIds.ArbitrumNovaMainnet,
    {
      getFeeAssetId: () => arbitrumNovaAssetId,
      getDisplayName: () => 'Arbitrum Nova',
    },
  ],
  [
    KnownChainIds.BaseMainnet,
    {
      getFeeAssetId: () => baseAssetId,
      getDisplayName: () => 'Base',
    },
  ],
  [
    KnownChainIds.ThorchainMainnet,
    {
      getFeeAssetId: () => thorchainAssetId,
      getDisplayName: () => 'Thorchain',
    },
  ],
])
