import { fromAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import type { Asset } from 'lib/asset-service'
import type { SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { deposit } from 'lib/swapper/swappers/ThorchainSwapper/evm/routerCalldata'
import { getInboundAddressDataForChain } from 'lib/swapper/swappers/ThorchainSwapper/utils/getInboundAddressDataForChain'
import { isNativeEvmAsset } from 'lib/swapper/swappers/utils/helpers/helpers'

type GetEvmThorTxInfoArgs = {
  sellAsset: Asset
  sellAmountCryptoBaseUnit: string
  memo: string
}

type GetEvmThorTxInfoReturn = Promise<
  Result<
    {
      data: string
      router: string
    },
    SwapErrorRight
  >
>

type GetBtcThorTxInfo = (args: GetEvmThorTxInfoArgs) => GetEvmThorTxInfoReturn

export const getThorTxInfo: GetBtcThorTxInfo = async ({
  sellAsset,
  sellAmountCryptoBaseUnit,
  memo,
}) => {
  const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
  const { assetReference } = fromAssetId(sellAsset.assetId)

  const maybeInboundAddress = await getInboundAddressDataForChain(daemonUrl, sellAsset.assetId)
  if (maybeInboundAddress.isErr()) return Err(maybeInboundAddress.unwrapErr())
  const inboundAddress = maybeInboundAddress.unwrap()

  const router = inboundAddress.router
  const vault = inboundAddress.address

  if (!router)
    return Err(
      makeSwapErrorRight({
        message: `[getPriceRatio]: No router found for ${sellAsset.assetId}`,
        code: SwapErrorType.RESPONSE_ERROR,
        details: { inboundAddress: maybeInboundAddress },
      }),
    )

  const data = deposit(
    router,
    vault,
    isNativeEvmAsset(sellAsset.assetId)
      ? '0x0000000000000000000000000000000000000000'
      : assetReference,
    sellAmountCryptoBaseUnit,
    memo,
  )

  return Ok({ data, router })
}
