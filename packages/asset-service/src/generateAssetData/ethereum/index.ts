import { ethChainId, toAssetId } from '@shapeshiftoss/caip'
import axios from 'axios'
import chunk from 'lodash/chunk'
import orderBy from 'lodash/orderBy'
import uniqBy from 'lodash/uniqBy'

import { Asset } from '../../service/AssetService'
import { getRenderedIdenticonBase64, IdenticonOptions } from '../../service/GenerateAssetIcon'
import { generateTrustWalletUrl } from '../../service/TrustWalletService'
import { ethereum } from '../baseAssets'
import * as coingecko from '../coingecko'
import { getIdleTokens } from './idleVaults'
import { getUniswapV2Pools } from './uniswapV2Pools'
import { getUnderlyingVaultTokens, getYearnVaults, getZapperTokens } from './yearnVaults'

const foxyToken: Asset = {
  assetId: toAssetId({
    chainId: ethChainId,
    assetNamespace: 'erc20',
    assetReference: '0xDc49108ce5C57bc3408c3A5E95F3d864eC386Ed3',
  }),
  chainId: ethChainId,
  name: 'FOX Yieldy',
  precision: 18,
  color: '#CE3885',
  icon: 'https://raw.githubusercontent.com/shapeshift/lib/main/packages/asset-service/src/generateAssetData/ethereum/icons/foxy-icon.png',
  symbol: 'FOXy',
  explorer: ethereum.explorer,
  explorerAddressLink: ethereum.explorerAddressLink,
  explorerTxLink: ethereum.explorerTxLink,
}

export const getAssets = async (): Promise<Asset[]> => {
  const [ethTokens, yearnVaults, zapperTokens, underlyingTokens, uniV2PoolTokens, idleTokens] =
    await Promise.all([
      coingecko.getAssets(ethChainId),
      getYearnVaults(),
      getZapperTokens(),
      getUnderlyingVaultTokens(),
      getUniswapV2Pools(),
      getIdleTokens(),
    ])

  const ethAssets = [
    ethereum,
    foxyToken,
    ...ethTokens,
    ...yearnVaults,
    ...zapperTokens,
    ...underlyingTokens,
    ...uniV2PoolTokens,
    ...idleTokens,
  ]
  const uniqueAssets = orderBy(uniqBy(ethAssets, 'assetId'), 'assetId') // Remove dups and order for PR readability
  const batchSize = 100 // tune this to keep rate limiting happy
  const assetBatches = chunk(uniqueAssets, batchSize)
  let modifiedAssets: Asset[] = []
  for (const [i, batch] of assetBatches.entries()) {
    console.info(`processing batch ${i + 1} of ${assetBatches.length}`)
    const promises = batch.map(async ({ assetId }) => {
      const { info } = generateTrustWalletUrl(assetId)
      return axios.head(info) // return promise
    })
    const result = await Promise.allSettled(promises)
    const newModifiedTokens = result.map((res, idx) => {
      const key = i * batchSize + idx
      if (res.status === 'rejected') {
        if (!uniqueAssets[key].icon) {
          const options: IdenticonOptions = {
            identiconImage: {
              size: 128,
              background: [45, 55, 72, 255],
            },
            identiconText: {
              symbolScale: 7,
              enableShadow: true,
            },
          }
          uniqueAssets[key].icon = getRenderedIdenticonBase64(
            uniqueAssets[key].assetId,
            uniqueAssets[key].symbol.substring(0, 3),
            options,
          )
        }
        return uniqueAssets[key] // token without modified icon
      } else {
        const { icon } = generateTrustWalletUrl(uniqueAssets[key].assetId)
        return { ...uniqueAssets[key], icon }
      }
    })
    modifiedAssets = modifiedAssets.concat(newModifiedTokens)
  }

  return [ethereum, ...modifiedAssets]
}
