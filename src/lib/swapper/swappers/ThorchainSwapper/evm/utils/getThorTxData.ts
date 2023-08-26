import { fromAssetId } from '@shapeshiftoss/caip'
import { getConfig } from 'config'
import type { Asset } from 'lib/asset-service'
import { deposit } from 'lib/swapper/swappers/ThorchainSwapper/evm/routerCalldata'
import { getInboundAddressDataForChain } from 'lib/swapper/swappers/ThorchainSwapper/utils/getInboundAddressDataForChain'
import { isNativeEvmAsset } from 'lib/swapper/swappers/utils/helpers/helpers'

type GetEvmThorTxInfoArgs = {
  sellAsset: Asset
  sellAmountCryptoBaseUnit: string
  memo: string
}

type GetEvmThorTxInfoReturn = Promise<{
  data: string
  router: string
}>

export const getThorTxInfo = async ({
  sellAsset,
  sellAmountCryptoBaseUnit,
  memo,
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

  const data = deposit(
    router,
    vault,
    isNativeEvmAsset(sellAsset.assetId)
      ? '0x0000000000000000000000000000000000000000'
      : assetReference,
    sellAmountCryptoBaseUnit,
    memo,
  )

  return { data, router }
}
