import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { Address } from 'viem'
import { getAddress } from 'viem'

import { depositWithExpiry, getInboundAddressDataForChain } from '../../../../thorchain-utils'
import type { SwapperConfig } from '../../../../types'
import { isNativeEvmAsset } from '../../../utils/helpers/helpers'

type GetEvmThorTxInfoArgs = {
  sellAsset: Asset
  sellAmountCryptoBaseUnit: string
  memo: string
  expiry: number
  config: SwapperConfig
}

type GetEvmThorTxInfoReturn = Promise<{
  data: string
  router: Address
  vault: Address
}>

export const getThorTxInfo = async ({
  sellAsset,
  sellAmountCryptoBaseUnit,
  memo,
  expiry,
  config,
}: GetEvmThorTxInfoArgs): GetEvmThorTxInfoReturn => {
  const daemonUrl = config.VITE_THORCHAIN_NODE_URL
  const { assetReference } = fromAssetId(sellAsset.assetId)

  const maybeInboundAddress = await getInboundAddressDataForChain(daemonUrl, sellAsset.assetId)
  if (maybeInboundAddress.isErr()) throw maybeInboundAddress.unwrapErr()
  const inboundAddress = maybeInboundAddress.unwrap()

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
