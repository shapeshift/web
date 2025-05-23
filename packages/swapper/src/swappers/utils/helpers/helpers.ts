import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumAssetId,
  avalancheAssetId,
  baseAssetId,
  bscAssetId,
  ethAssetId,
  fromAssetId,
  gnosisAssetId,
  optimismAssetId,
  polygonAssetId,
} from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { TreasuryChainId } from '@shapeshiftoss/utils'
import {
  DAO_TREASURY_ARBITRUM,
  DAO_TREASURY_AVALANCHE,
  DAO_TREASURY_BASE,
  DAO_TREASURY_BITCOIN,
  DAO_TREASURY_BSC,
  DAO_TREASURY_ETHEREUM_MAINNET,
  DAO_TREASURY_GNOSIS,
  DAO_TREASURY_OPTIMISM,
  DAO_TREASURY_POLYGON,
  DAO_TREASURY_SOLANA,
  isTreasuryChainId,
} from '@shapeshiftoss/utils'

export const isNativeEvmAsset = (assetId: AssetId): boolean => {
  const { chainId } = fromAssetId(assetId)
  switch (chainId) {
    case KnownChainIds.EthereumMainnet:
      return assetId === ethAssetId
    case KnownChainIds.AvalancheMainnet:
      return assetId === avalancheAssetId
    case KnownChainIds.OptimismMainnet:
      return assetId === optimismAssetId
    case KnownChainIds.BnbSmartChainMainnet:
      return assetId === bscAssetId
    case KnownChainIds.PolygonMainnet:
      return assetId === polygonAssetId
    case KnownChainIds.GnosisMainnet:
      return assetId === gnosisAssetId
    case KnownChainIds.ArbitrumMainnet:
      return assetId === arbitrumAssetId
    case KnownChainIds.BaseMainnet:
      return assetId === baseAssetId
    default:
      return false
  }
}

const DAO_TREASURY_BY_CHAIN_ID: Record<TreasuryChainId, string> = {
  [KnownChainIds.EthereumMainnet]: DAO_TREASURY_ETHEREUM_MAINNET,
  [KnownChainIds.OptimismMainnet]: DAO_TREASURY_OPTIMISM,
  [KnownChainIds.AvalancheMainnet]: DAO_TREASURY_AVALANCHE,
  [KnownChainIds.PolygonMainnet]: DAO_TREASURY_POLYGON,
  [KnownChainIds.GnosisMainnet]: DAO_TREASURY_GNOSIS,
  [KnownChainIds.BnbSmartChainMainnet]: DAO_TREASURY_BSC,
  [KnownChainIds.ArbitrumMainnet]: DAO_TREASURY_ARBITRUM,
  [KnownChainIds.BaseMainnet]: DAO_TREASURY_BASE,
  [KnownChainIds.SolanaMainnet]: DAO_TREASURY_SOLANA,
  [KnownChainIds.BitcoinMainnet]: DAO_TREASURY_BITCOIN,
}

export const getTreasuryAddressFromChainId = (chainId: ChainId): string => {
  const maybeTreasuryChainId = isTreasuryChainId(chainId) ? chainId : undefined
  const treasuryAddress = maybeTreasuryChainId
    ? DAO_TREASURY_BY_CHAIN_ID[maybeTreasuryChainId]
    : undefined
  if (!treasuryAddress)
    throw new Error(`[getTreasuryAddressFromChainId] - Unsupported chainId: ${chainId}`)
  return treasuryAddress
}
