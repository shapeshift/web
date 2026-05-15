import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  ASSET_NAMESPACE,
  baseChainId,
  bscChainId,
  btcAssetId,
  btcChainId,
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
  chainId: ChainId
  decimals: number
  contractAddress: string | null
}

const ltcAssetId = toAssetId({
  chainId: ltcChainId,
  assetNamespace: ASSET_NAMESPACE.slip44,
  assetReference: '2',
})

const erc20 = (chainId: ChainId, address: string): AssetId =>
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
  {
    id: 'bitcoin:btc',
    assetId: btcAssetId,
    chainId: btcChainId,
    decimals: 8,
    contractAddress: null,
  },
  {
    id: 'litecoin:ltc',
    assetId: ltcAssetId,
    chainId: ltcChainId,
    decimals: 8,
    contractAddress: null,
  },
  {
    id: 'ethereum:usdt',
    assetId: erc20(ethChainId, '0xdAC17F958D2ee523a2206206994597C13D831ec7'),
    chainId: ethChainId,
    decimals: 6,
    contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
  {
    id: 'ethereum:wbtc',
    assetId: erc20(ethChainId, '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'),
    chainId: ethChainId,
    decimals: 8,
    contractAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  },
  {
    id: 'ethereum:cbbtc',
    assetId: erc20(ethChainId, '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf'),
    chainId: ethChainId,
    decimals: 8,
    contractAddress: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
  },
  {
    id: 'ethereum:usdc',
    assetId: erc20(ethChainId, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'),
    chainId: ethChainId,
    decimals: 6,
    contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  },
  {
    id: 'base:cbbtc',
    assetId: erc20(baseChainId, '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf'),
    chainId: baseChainId,
    decimals: 8,
    contractAddress: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
  },
  {
    id: 'base:cbltc',
    assetId: erc20(baseChainId, '0xcb17C9Db87B595717C857a08468793f5bAb6445F'),
    chainId: baseChainId,
    decimals: 8,
    contractAddress: '0xcb17C9Db87B595717C857a08468793f5bAb6445F',
  },
  {
    id: 'bnbchain:btcb',
    assetId: erc20(bscChainId, '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c'),
    chainId: bscChainId,
    decimals: 18,
    contractAddress: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
  },
  {
    id: 'arbitrum:wbtc',
    assetId: erc20(arbitrumChainId, '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'),
    chainId: arbitrumChainId,
    decimals: 8,
    contractAddress: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
  },
  {
    id: 'arbitrum:ibtc',
    assetId: erc20(arbitrumChainId, '0x050C24dBf1eEc17babE5fc585F06116A259CC77A'),
    chainId: arbitrumChainId,
    decimals: 8,
    contractAddress: '0x050C24dBf1eEc17babE5fc585F06116A259CC77A',
  },
  {
    id: 'monad:mon',
    assetId: monadNativeAssetId,
    chainId: monadChainId,
    decimals: 18,
    contractAddress: null,
  },
  {
    id: 'monad:usdc',
    assetId: erc20(monadChainId, '0x754704Bc059F8C67012fEd69BC8A327a5aafb603'),
    chainId: monadChainId,
    decimals: 6,
    contractAddress: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603',
  },
  {
    id: 'hyperevm:ubtc',
    assetId: erc20(hyperEvmChainId, '0x9FDBdA0A5e284c32744D2f17Ee5c74B284993463'),
    chainId: hyperEvmChainId,
    decimals: 8,
    contractAddress: '0x9FDBdA0A5e284c32744D2f17Ee5c74B284993463',
  },
  {
    id: 'megaeth:btc.b',
    assetId: erc20(megaethChainId, '0xB0F70C0bD6FD87dbEb7C10dC692a2a6106817072'),
    chainId: megaethChainId,
    decimals: 8,
    contractAddress: '0xB0F70C0bD6FD87dbEb7C10dC692a2a6106817072',
  },
  {
    id: 'starknet:wbtc',
    assetId: starknetToken('0x3fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac'),
    chainId: starknetChainId,
    decimals: 8,
    contractAddress: '0x3fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac',
  },
  {
    id: 'starknet:strkbtc',
    assetId: starknetToken('0x0787150e306e6eae6e3f79dea881770e8bbff2c1b8eb490f969669ee945b3135'),
    chainId: starknetChainId,
    decimals: 8,
    contractAddress: '0x0787150e306e6eae6e3f79dea881770e8bbff2c1b8eb490f969669ee945b3135',
  },
  {
    id: 'solana:sol',
    assetId: solanaNativeAssetId,
    chainId: solanaChainId,
    decimals: 9,
    contractAddress: null,
  },
  {
    id: 'solana:usdc',
    assetId: splToken('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
    chainId: solanaChainId,
    decimals: 6,
    contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  },
  {
    id: 'solana:cbbtc',
    assetId: splToken('cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij'),
    chainId: solanaChainId,
    decimals: 8,
    contractAddress: 'cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij',
  },
  {
    id: 'solana:cash',
    assetId: splToken('CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH'),
    chainId: solanaChainId,
    decimals: 6,
    contractAddress: 'CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH',
  },
  {
    id: 'tron:usdt',
    assetId: trc20('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'),
    chainId: tronChainId,
    decimals: 6,
    contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  },
] as const

export const GARDEN_BLACKLIST_PAIRS: readonly string[] = [
  'starknet:wbtc <-> arbitrum:wbtc',
  'starknet:wbtc <-> megaeth:btc.b',
  'starknet:wbtc <-> monad:mon',
  'starknet:strkbtc <-> ethereum:cbbtc',
  'solana:usdc <-> starknet:strkbtc',
  'starknet:wbtc <-> litecoin:ltc',
  'ethereum:cbbtc <-> starknet:wbtc',
  'starknet:wbtc <-> ethereum:wbtc',
  'starknet:strkbtc <-> citrea:cbtc',
  'starknet:wbtc <-> monad:usdc',
  'starknet:wbtc <-> citrea:cbtc',
  'starknet:strkbtc <-> arbitrum:ibtc',
  'ethereum:usdt <-> starknet:wbtc',
  'base:cbbtc <-> starknet:wbtc',
  'solana:sol <-> starknet:wbtc',
  'arbitrum:ibtc <-> starknet:wbtc',
  'starknet:strkbtc <-> monad:mon',
  'starknet:strkbtc <-> monad:usdc',
  'starknet:strkbtc <-> megaeth:btc.b',
  'starknet:strkbtc <-> ethereum:wbtc',
  'starknet:strkbtc <-> solana:cbbtc',
  'starknet:wbtc <-> hyperevm:ubtc',
  'starknet:strkbtc <-> arbitrum:wbtc',
  'starknet:strkbtc <-> hyperevm:ubtc',
  'starknet:strkbtc <-> ethereum:usdt',
  'tron:usdt <-> starknet:strkbtc',
  'starknet:wbtc <-> ethereum:usdc',
  'solana:sol <-> starknet:strkbtc',
  'tron:usdt <-> starknet:wbtc',
  'solana:usdc <-> starknet:wbtc',
  'base:cbltc <-> starknet:wbtc',
  'starknet:strkbtc <-> ethereum:usdc',
  'starknet:strkbtc <-> base:cbbtc',
  'starknet:strkbtc <-> base:cbltc',
  'starknet:strkbtc <-> litecoin:ltc',
  'starknet:wbtc <-> solana:cbbtc',
] as const

const REGISTRY_BY_ASSETID = new Map(gardenAssetRegistry.map(a => [a.assetId, a]))
const REGISTRY_BY_GARDEN_ID = new Map(gardenAssetRegistry.map(a => [a.id, a]))

export const lookupGardenAssetByAssetId = (assetId: AssetId): GardenAssetEntry | undefined =>
  REGISTRY_BY_ASSETID.get(assetId)

export const lookupGardenAssetByGardenId = (gardenId: string): GardenAssetEntry | undefined =>
  REGISTRY_BY_GARDEN_ID.get(gardenId)

export const isGardenPairBlacklisted = (sellGardenId: string, buyGardenId: string): boolean => {
  for (const entry of GARDEN_BLACKLIST_PAIRS) {
    const [a, b] = entry.split(' <-> ')
    if ((a === sellGardenId && b === buyGardenId) || (a === buyGardenId && b === sellGardenId)) {
      return true
    }
  }
  return false
}
