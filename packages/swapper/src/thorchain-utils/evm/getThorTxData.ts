import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { Address } from 'viem'
import { getAddress } from 'viem'

import { isNativeEvmAsset } from '../../swappers/utils/helpers/helpers'
import type { SwapperConfig } from '../../types'
import { SwapperName } from '../../types'
import { getInboundAddressDataForChain } from '../getInboundAddressDataForChain'
import { depositWithExpiry } from '../routerCallData/routerCalldata'

type GetThorTxDataArgs = {
  sellAsset: Asset
  sellAmountCryptoBaseUnit: string
  memo: string
  expiry: number
  config: SwapperConfig
  swapperName: SwapperName
}

type GetThorTxDataReturn = Promise<{
  data: string
  router: Address
  vault: Address
}>

export const getThorTxData = async ({
  sellAsset,
  sellAmountCryptoBaseUnit,
  memo,
  expiry,
  config,
  swapperName,
}: GetThorTxDataArgs): GetThorTxDataReturn => {
  const { assetReference } = fromAssetId(sellAsset.assetId)

  const url = (() => {
    switch (swapperName) {
      case SwapperName.Thorchain:
        return `${config.VITE_THORCHAIN_NODE_URL}/thorchain`
      case SwapperName.Mayachain:
        return `${config.VITE_MAYACHAIN_NODE_URL}/mayachain`
      default:
        throw new Error(`Invalid swapper name: ${swapperName}`)
    }
  })()

  const res = await getInboundAddressDataForChain(url, sellAsset.assetId, true, swapperName)
  if (res.isErr()) throw res.unwrapErr()

  const inboundAddress = res.unwrap()

  const router = getAddress(inboundAddress.router ?? '')
  const vault = getAddress(inboundAddress.address)

  if (!router) {
    throw Error(`No router found for ${sellAsset.assetId} at inbound address ${inboundAddress}`)
  }

  const data = depositWithExpiry({
    vault,
    asset: isNativeEvmAsset(sellAsset.assetId)
      ? '0x0000000000000000000000000000000000000000'
      : getAddress(assetReference),
    amount: BigInt(sellAmountCryptoBaseUnit),
    memo,
    expiry: BigInt(expiry),
  })

  return { data, router, vault }
}
