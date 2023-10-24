import { fromAssetId } from '@shapeshiftoss/caip'
import { getConfig } from 'config'
import type { Asset } from 'lib/asset-service'
import { depositWithExpiry } from 'lib/swapper/swappers/ThorchainSwapper/evm/routerCalldata'
import { getInboundAddressDataForChain } from 'lib/swapper/swappers/ThorchainSwapper/utils/getInboundAddressDataForChain'
import { isNativeEvmAsset } from 'lib/swapper/swappers/utils/helpers/helpers'

type GetEvmThorTxInfoArgs = {
  sellAsset: Asset
  sellAmountCryptoBaseUnit: string
  memo: string
  expiry: number
}

type GetEvmThorTxInfoReturn = Promise<{
  data: string
  router: string
}>

export const getThorTxInfo = async ({
  sellAsset,
  sellAmountCryptoBaseUnit,
  memo,
  expiry,
}: GetEvmThorTxInfoArgs): GetEvmThorTxInfoReturn => {
  const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
  const { assetReference } = fromAssetId(sellAsset.assetId)

  const maybeInboundAddress = await getInboundAddressDataForChain(daemonUrl, sellAsset.assetId)
  if (maybeInboundAddress.isErr()) throw maybeInboundAddress.unwrapErr()
  const inboundAddress = maybeInboundAddress.unwrap()

  const router = inboundAddress.router
  const vault = inboundAddress.address

  if (!router) {
    throw Error(`No router found for ${sellAsset.assetId} at inbound address ${inboundAddress}`)
  }

  const data = depositWithExpiry({
    _contractAddress: router,
    vault,
    asset: isNativeEvmAsset(sellAsset.assetId)
      ? '0x0000000000000000000000000000000000000000'
      : assetReference,
    amount: sellAmountCryptoBaseUnit,
    memo,
    expiry,
  })

  return { data, router }
}
