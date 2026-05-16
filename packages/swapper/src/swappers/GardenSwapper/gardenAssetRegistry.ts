import type { AssetId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  ASSET_NAMESPACE,
  baseChainId,
  bscChainId,
  btcAssetId,
  ethChainId,
  hyperEvmChainId,
  ltcChainId,
  megaethChainId,
  monadChainId,
  solanaChainId,
  starknetChainId,
  toAssetId,
  tronChainId,
} from '@shapeshiftoss/caip'

export type GardenAssetEntry = {
  id: string
  assetId: AssetId
}

const ltcAssetId = toAssetId({
  chainId: ltcChainId,
  assetNamespace: ASSET_NAMESPACE.slip44,
  assetReference: '2',
})

const erc20 = (chainId: typeof ethChainId, address: string): AssetId =>
  toAssetId({
    chainId,
    assetNamespace: ASSET_NAMESPACE.erc20,
    assetReference: address.toLowerCase(),
  })

const monadNativeAssetId = toAssetId({
  chainId: monadChainId,
  assetNamespace: ASSET_NAMESPACE.slip44,
  assetReference: '60',
})

const solanaNativeAssetId = toAssetId({
  chainId: solanaChainId,
  assetNamespace: ASSET_NAMESPACE.slip44,
  assetReference: '501',
})

const splToken = (address: string): AssetId =>
  toAssetId({
    chainId: solanaChainId,
    assetNamespace: ASSET_NAMESPACE.splToken,
    assetReference: address,
  })

const trc20 = (address: string): AssetId =>
  toAssetId({
    chainId: tronChainId,
    assetNamespace: ASSET_NAMESPACE.trc20,
    assetReference: address,
  })

const starknetToken = (address: string): AssetId =>
  toAssetId({
    chainId: starknetChainId,
    assetNamespace: ASSET_NAMESPACE.starknetToken,
    assetReference: address,
  })

export const gardenAssetRegistry: readonly GardenAssetEntry[] = [
  { id: 'bitcoin:btc', assetId: btcAssetId },
  { id: 'litecoin:ltc', assetId: ltcAssetId },
  { id: 'ethereum:usdt', assetId: erc20(ethChainId, '0xdAC17F958D2ee523a2206206994597C13D831ec7') },
  { id: 'ethereum:wbtc', assetId: erc20(ethChainId, '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599') },
  {
    id: 'ethereum:cbbtc',
    assetId: erc20(ethChainId, '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf'),
  },
  { id: 'ethereum:usdc', assetId: erc20(ethChainId, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48') },
  { id: 'base:cbbtc', assetId: erc20(baseChainId, '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf') },
  { id: 'base:cbltc', assetId: erc20(baseChainId, '0xcb17C9Db87B595717C857a08468793f5bAb6445F') },
  { id: 'bnbchain:btcb', assetId: erc20(bscChainId, '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c') },
  {
    id: 'arbitrum:wbtc',
    assetId: erc20(arbitrumChainId, '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'),
  },
  {
    id: 'arbitrum:ibtc',
    assetId: erc20(arbitrumChainId, '0x050C24dBf1eEc17babE5fc585F06116A259CC77A'),
  },
  { id: 'monad:mon', assetId: monadNativeAssetId },
  { id: 'monad:usdc', assetId: erc20(monadChainId, '0x754704Bc059F8C67012fEd69BC8A327a5aafb603') },
  {
    id: 'hyperevm:ubtc',
    assetId: erc20(hyperEvmChainId, '0x9FDBdA0A5e284c32744D2f17Ee5c74B284993463'),
  },
  {
    id: 'megaeth:btc.b',
    assetId: erc20(megaethChainId, '0xB0F70C0bD6FD87dbEb7C10dC692a2a6106817072'),
  },
  {
    id: 'starknet:wbtc',
    assetId: starknetToken('0x3fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac'),
  },
  {
    id: 'starknet:strkbtc',
    assetId: starknetToken('0x0787150e306e6eae6e3f79dea881770e8bbff2c1b8eb490f969669ee945b3135'),
  },
  { id: 'solana:sol', assetId: solanaNativeAssetId },
  { id: 'solana:usdc', assetId: splToken('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') },
  { id: 'solana:cbbtc', assetId: splToken('cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij') },
  { id: 'solana:cash', assetId: splToken('CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH') },
  { id: 'tron:usdt', assetId: trc20('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t') },
] as const

const REGISTRY_BY_ASSETID = new Map(gardenAssetRegistry.map(a => [a.assetId, a]))

export const lookupGardenAssetByAssetId = (assetId: AssetId): GardenAssetEntry | undefined =>
  REGISTRY_BY_ASSETID.get(assetId)
