import { aptosChainId, ASSET_NAMESPACE, toAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { aptos, unfreeze } from '@shapeshiftoss/utils'
import axios from 'axios'
import uniqBy from 'lodash/uniqBy'

const PANORA_API_BASE = 'https://api.panora.exchange'

// Aptos has no public CoinGecko token list (their tokens endpoint returns 403),
// so we use Panora's tokenlist as the source of truth for tradeable assets.
// Panora is the DEX aggregator we integrate with, so this matches what users can swap.

type PanoraToken = {
  chainId: number
  tokenAddress: string | null
  faAddress: string | null
  name: string
  symbol: string
  decimals: number
  logoUrl: string | null
  panoraUI: boolean
  panoraTags: string[] | null
  isBanned: boolean
}

type PanoraResponse = { status: string; data: PanoraToken[] } | PanoraToken[]

// Trusted tag set — excludes "Emojicoin" / "Meme"-only spam.
// Per Panora's taxonomy: Native/Verified are official, Bridged is canonical cross-chain
// (e.g. LayerZero USDC), Recognized/RWA cover BUIDL etc.
const TRUSTED_TAGS = new Set(['Verified', 'Recognized', 'RWA', 'Bridged'])

const fetchPanoraTokens = async (): Promise<Asset[]> => {
  const apiKey = process.env.VITE_PANORA_API_KEY
  if (!apiKey) throw new Error('Missing VITE_PANORA_API_KEY - source ~/.zshrc or set it')

  const { data } = await axios.get<PanoraResponse>(`${PANORA_API_BASE}/tokenlist`, {
    headers: { 'x-api-key': apiKey },
    timeout: 30000,
  })

  const tokens = Array.isArray(data) ? data : data.data

  return tokens
    .filter(t => t.panoraUI && !t.isBanned)
    .filter(t => (t.panoraTags ?? []).some(tag => TRUSTED_TAGS.has(tag)))
    .filter(t => Boolean(t.faAddress || t.tokenAddress))
    .filter(t => t.tokenAddress !== '0x1::aptos_coin::AptosCoin' && t.faAddress !== '0xa')
    .map(token => {
      // Prefer faAddress (modern Aptos Fungible Asset standard, universally supported by Panora).
      // Falls back to tokenAddress for legacy coin-standard-only tokens.
      const assetReference = (token.faAddress ?? token.tokenAddress) as string
      const assetId = toAssetId({
        chainId: aptosChainId,
        assetNamespace: ASSET_NAMESPACE.aptosCoin,
        assetReference,
      })
      const asset: Asset = {
        assetId,
        chainId: aptosChainId,
        name: token.name,
        symbol: token.symbol,
        precision: token.decimals,
        color: aptos.color,
        icon: token.logoUrl ?? '',
        explorer: aptos.explorer,
        explorerAddressLink: aptos.explorerAddressLink,
        explorerTxLink: aptos.explorerTxLink,
        relatedAssetKey: null,
      }
      return asset
    })
}

export const getAssets = async (): Promise<Asset[]> => {
  const panoraAssets = await fetchPanoraTokens()

  const allAssets = uniqBy(panoraAssets, 'assetId')

  return [unfreeze(aptos), ...allAssets]
}
