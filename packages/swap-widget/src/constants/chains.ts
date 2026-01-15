import type { Asset } from '@shapeshiftoss/types'
import {
  arbitrum,
  arbitrumNova,
  atom,
  avax,
  base,
  bitcoin,
  bitcoincash,
  bnbsmartchain,
  dogecoin,
  ethereum,
  gnosis,
  hyperevm,
  katana,
  litecoin,
  mayachain,
  monad,
  optimism,
  plasma,
  polygon,
  solana,
  thorchain,
} from '@shapeshiftoss/utils'

import type { ChainId } from '../types'

const BASE_ASSETS_BY_CHAIN_ID: Record<ChainId, Asset> = {
  [ethereum.chainId]: ethereum,
  [arbitrum.chainId]: arbitrum,
  [arbitrumNova.chainId]: arbitrumNova,
  [optimism.chainId]: optimism,
  [polygon.chainId]: polygon,
  [base.chainId]: base,
  [avax.chainId]: avax,
  [bnbsmartchain.chainId]: bnbsmartchain,
  [gnosis.chainId]: gnosis,
  [monad.chainId]: monad,
  [hyperevm.chainId]: hyperevm,
  [plasma.chainId]: plasma,
  [katana.chainId]: katana,
  [bitcoin.chainId]: bitcoin,
  [bitcoincash.chainId]: bitcoincash,
  [dogecoin.chainId]: dogecoin,
  [litecoin.chainId]: litecoin,
  [atom.chainId]: atom,
  [thorchain.chainId]: thorchain,
  [mayachain.chainId]: mayachain,
  [solana.chainId]: solana,
}

export const getBaseAsset = (chainId: ChainId): Asset | undefined => {
  return BASE_ASSETS_BY_CHAIN_ID[chainId]
}

export const getChainName = (chainId: ChainId): string => {
  return BASE_ASSETS_BY_CHAIN_ID[chainId]?.networkName ?? chainId
}

export const getChainIcon = (chainId: ChainId): string | undefined => {
  const asset = BASE_ASSETS_BY_CHAIN_ID[chainId]
  return asset?.networkIcon ?? asset?.icon
}

export const getChainColor = (chainId: ChainId): string => {
  const asset = BASE_ASSETS_BY_CHAIN_ID[chainId]
  return (asset as Asset & { networkColor?: string })?.networkColor ?? asset?.color ?? '#888888'
}

export const getExplorerTxLink = (chainId: ChainId): string => {
  return BASE_ASSETS_BY_CHAIN_ID[chainId]?.explorerTxLink ?? 'https://etherscan.io/tx/'
}
