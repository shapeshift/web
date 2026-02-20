import type { ChainId } from '@shapeshiftoss/caip'
import {
  adapters,
  arbitrumChainId,
  ASSET_NAMESPACE,
  avalancheChainId,
  baseChainId,
  berachainChainId,
  bscChainId,
  ethChainId,
  gnosisChainId,
  hyperEvmChainId,
  inkChainId,
  katanaChainId,
  lineaChainId,
  megaethChainId,
  monadChainId,
  nearChainId,
  optimismChainId,
  plasmaChainId,
  polygonChainId,
  scrollChainId,
  solanaChainId,
  sonicChainId,
  starknetChainId,
  suiChainId,
  toAssetId,
  tonChainId,
  tronChainId,
} from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import {
  arbitrum,
  avax,
  base,
  berachain,
  bnbsmartchain,
  ethereum,
  gnosis,
  hyperevm,
  ink,
  katana,
  linea,
  megaeth,
  monad,
  near,
  optimism,
  plasma,
  polygon,
  scroll,
  solana,
  sonic,
  sui,
  ton,
  tron,
} from '@shapeshiftoss/utils'
import axios from 'axios'

import colormap from './color-map.json'

export const colorMap: Record<string, string> = colormap

export type Token = {
  chainId: number
  address: string
  name: string
  symbol: string
  decimals: number
  logoURI: string
}

export type TokenList = {
  name: string
  logoURI: string
  keywords: string[]
  timestamp: string
  tokens: Token[]
}
export async function getAssets(chainId: ChainId): Promise<Asset[]> {
  const { assetNamespace, category, explorer, explorerAddressLink, explorerTxLink } = (() => {
    switch (chainId) {
      case ethChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: ethereum.explorer,
          explorerAddressLink: ethereum.explorerAddressLink,
          explorerTxLink: ethereum.explorerTxLink,
        }
      case avalancheChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: avax.explorer,
          explorerAddressLink: avax.explorerAddressLink,
          explorerTxLink: avax.explorerTxLink,
        }
      case optimismChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: optimism.explorer,
          explorerAddressLink: optimism.explorerAddressLink,
          explorerTxLink: optimism.explorerTxLink,
        }
      case bscChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: bnbsmartchain.explorer,
          explorerAddressLink: bnbsmartchain.explorerAddressLink,
          explorerTxLink: bnbsmartchain.explorerTxLink,
        }
      case polygonChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: polygon.explorer,
          explorerAddressLink: polygon.explorerAddressLink,
          explorerTxLink: polygon.explorerTxLink,
        }
      case gnosisChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: gnosis.explorer,
          explorerAddressLink: gnosis.explorerAddressLink,
          explorerTxLink: gnosis.explorerTxLink,
        }
      case arbitrumChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: arbitrum.explorer,
          explorerAddressLink: arbitrum.explorerAddressLink,
          explorerTxLink: arbitrum.explorerTxLink,
        }
      case baseChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: base.explorer,
          explorerAddressLink: base.explorerAddressLink,
          explorerTxLink: base.explorerTxLink,
        }
      case monadChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: monad.explorer,
          explorerAddressLink: monad.explorerAddressLink,
          explorerTxLink: monad.explorerTxLink,
        }
      case hyperEvmChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: hyperevm.explorer,
          explorerAddressLink: hyperevm.explorerAddressLink,
          explorerTxLink: hyperevm.explorerTxLink,
        }
      case plasmaChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: plasma.explorer,
          explorerAddressLink: plasma.explorerAddressLink,
          explorerTxLink: plasma.explorerTxLink,
        }
      case inkChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: ink.explorer,
          explorerAddressLink: ink.explorerAddressLink,
          explorerTxLink: ink.explorerTxLink,
        }
      case megaethChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: megaeth.explorer,
          explorerAddressLink: megaeth.explorerAddressLink,
          explorerTxLink: megaeth.explorerTxLink,
        }
      case lineaChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: linea.explorer,
          explorerAddressLink: linea.explorerAddressLink,
          explorerTxLink: linea.explorerTxLink,
        }
      case scrollChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: scroll.explorer,
          explorerAddressLink: scroll.explorerAddressLink,
          explorerTxLink: scroll.explorerTxLink,
        }
      case katanaChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: katana.explorer,
          explorerAddressLink: katana.explorerAddressLink,
          explorerTxLink: katana.explorerTxLink,
        }
      case berachainChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: berachain.explorer,
          explorerAddressLink: berachain.explorerAddressLink,
          explorerTxLink: berachain.explorerTxLink,
        }
      case sonicChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.erc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: sonic.explorer,
          explorerAddressLink: sonic.explorerAddressLink,
          explorerTxLink: sonic.explorerTxLink,
        }
      case solanaChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.splToken,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: solana.explorer,
          explorerAddressLink: solana.explorerAddressLink,
          explorerTxLink: solana.explorerTxLink,
        }
      case starknetChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.starknetToken,
          category: 'starknet',
          explorer: 'https://starkscan.co',
          explorerAddressLink: 'https://starkscan.co/contract/',
          explorerTxLink: 'https://starkscan.co/tx/',
        }
      case tronChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.trc20,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: tron.explorer,
          explorerAddressLink: tron.explorerAddressLink,
          explorerTxLink: tron.explorerTxLink,
        }
      case suiChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.suiCoin,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: sui.explorer,
          explorerAddressLink: sui.explorerAddressLink,
          explorerTxLink: sui.explorerTxLink,
        }
      case nearChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.nep141,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: near.explorer,
          explorerAddressLink: near.explorerAddressLink,
          explorerTxLink: near.explorerTxLink,
        }
      case tonChainId:
        return {
          assetNamespace: ASSET_NAMESPACE.jetton,
          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
          explorer: ton.explorer,
          explorerAddressLink: ton.explorerAddressLink,
          explorerTxLink: ton.explorerTxLink,
        }
      default:
        throw new Error(`no coingecko token support for chainId: ${chainId}`)
    }
  })()

  const { data } = await axios.get<TokenList>(`https://tokens.coingecko.com/${category}/all.json`)

  return data.tokens.reduce<Asset[]>((prev, token) => {
    try {
      const assetId = toAssetId({
        chainId,
        assetNamespace,
        assetReference: token.address,
      })

      const asset: Asset = {
        assetId,
        chainId,
        name: token.name,
        precision: token.decimals,
        color: colorMap[assetId] ?? '#FFFFFF',
        // The coingecko API returns thumbnails by default instead of large icons causing blurry images at some places
        // I couldn't find any other option to get the large icon except using the coingecko PRO api, so we are replacing the thumb with large
        icon: token.logoURI.replace('thumb', 'large'),
        symbol: token.symbol,
        explorer,
        explorerAddressLink,
        explorerTxLink,
        relatedAssetKey: undefined,
      }
      prev.push(asset)
    } catch {
      // unable to create assetId, skip token
    }

    return prev
  }, [])
}
