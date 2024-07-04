import { type AssetId, ethAssetId, ethChainId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip/src/assetId/assetId'
import type { Asset, AssetsByIdPartial, PartialRecord } from '@shapeshiftoss/types'
import { makeAsset } from '@shapeshiftoss/utils'
import type { AxiosRequestConfig } from 'axios'
import axios from 'axios'
import qs from 'qs'

import { WETH_TOKEN_CONTRACT_ADDRESS } from '../../../src/contracts/constants'
import generatedAssetData from '../../../src/lib/asset-service/service/generatedAssetData.json'
import {
  chainIdToZapperNetwork,
  V2AppTokensResponse,
  ZapperGroupId,
  zapperNetworkToChainId,
} from '../../../src/state/apis/zapper/validators'

export type AssetsState = {
  byId: AssetsByIdPartial
  ids: AssetId[]
  relatedAssetIndex: PartialRecord<AssetId, AssetId[]>
}

export type UpsertAssetsPayload = Omit<AssetsState, 'relatedAssetIndex'>

const ZAPPER_BASE_URL = 'https://api.zapper.xyz'

const authorization = `Basic ${Buffer.from(
  `${process.env.REACT_APP_ZAPPER_API_KEY}:`,
  'binary',
).toString('base64')}`

const options: AxiosRequestConfig = {
  method: 'GET' as const,
  baseURL: ZAPPER_BASE_URL,
  headers: {
    accept: 'application/json',
    authorization,
  },
  // Encode query params with arrayFormat: 'repeat' because zapper api expects it
  paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' }),
}

const headers = {
  accept: 'application/json',
  authorization,
}

const assets = generatedAssetData as any

export const getUniswapV2Pools = async () => {
  const evmNetworks = [chainIdToZapperNetwork(ethChainId)]

  // only UNI-V2 supported for now
  const url = `/v2/apps/uniswap-v2/tokens`
  const params = {
    groupId: ZapperGroupId.Pool,
    networks: evmNetworks,
  }
  const payload = { ...options, params, headers, url }
  const { data: res } = await axios.request({ ...payload })
  const zapperV2AppTokensData = V2AppTokensResponse.parse(res)

  const zapperAssets = zapperV2AppTokensData
    .map(appTokenData => {
      // This will never happen in this particular case because zodios will fail if e.g appTokenData.network is undefined
      // But zapperNetworkToChainId returns ChainId | undefined, as we may be calling it with invalid, casted "valid network"
      const chainId = zapperNetworkToChainId(appTokenData.network)
      if (!chainId) return null

      const assetId = toAssetId({
        chainId,
        assetNamespace: 'erc20',
        assetReference: appTokenData.address,
      })

      const underlyingAssets = (appTokenData.tokens ?? []).map(token => {
        const assetId = toAssetId({
          chainId,
          assetNamespace: 'erc20', // TODO: bep20
          assetReference: token.address,
        })
        const asset =
          token.address.toLowerCase() === WETH_TOKEN_CONTRACT_ADDRESS.toLowerCase()
            ? assets[ethAssetId]
            : assets[assetId]

        return asset
      })

      const name = underlyingAssets.every(asset => asset && asset.symbol)
        ? `${underlyingAssets.map(asset => asset?.symbol).join('/')} Pool`
        : (appTokenData.displayProps?.label ?? '').replace('WETH', 'ETH')
      const icons = underlyingAssets.map((underlyingAsset, i) => {
        return underlyingAsset?.icon ?? appTokenData.displayProps?.images[i] ?? ''
      })

      if (!(appTokenData.decimals && appTokenData.symbol)) return null

      return makeAsset(assets, {
        assetId,
        symbol: appTokenData.symbol,
        // WETH should be displayed as ETH in the UI due to the way UNI-V2 works
        // ETH is used for depositing/withdrawing, but WETH is used under the hood
        name,
        precision: Number(appTokenData.decimals),
        icons,
        icon: 'https://coin-images.coingecko.com/coins/images/12504/large/uni.jpg?1696512319',
      })
    })
    .filter(Boolean) as Asset[]

  return zapperAssets
}
