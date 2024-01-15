import type { AssetId } from '@shapeshiftoss/caip'
import type { SwapErrorRight } from '@shapeshiftoss/swapper'
import { makeSwapErrorRight, TradeQuoteError } from '@shapeshiftoss/swapper'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { InboundAddressResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { thorService } from 'lib/swapper/swappers/ThorchainSwapper/utils/thorService'

export const getInboundAddressDataForChain = async (
  daemonUrl: string,
  assetId: AssetId | undefined,
  excludeHalted = true,
): Promise<Result<InboundAddressResponse, SwapErrorRight>> => {
  if (!assetId)
    return Err(
      makeSwapErrorRight({
        message: '[getInboundAddressDataForChain]: AssetId is required',
        code: TradeQuoteError.InternalError,
      }),
    )
  const assetPoolId = assetIdToPoolAssetId({ assetId })
  const assetChainSymbol = assetPoolId?.slice(0, assetPoolId.indexOf('.'))

  return (
    await thorService.get<InboundAddressResponse[]>(`${daemonUrl}/lcd/thorchain/inbound_addresses`)
  )
    .andThen(({ data: inboundAddresses }) => {
      const activeInboundAddresses = inboundAddresses.filter(a => !a.halted)

      return Ok(
        (excludeHalted ? activeInboundAddresses : inboundAddresses).find(
          inbound => inbound.chain === assetChainSymbol,
        ),
      )
    })
    .andThen<InboundAddressResponse>(maybeInboundAddressResponse => {
      if (
        !maybeInboundAddressResponse ||
        // We should not need this. Added to conform to the previous inboundAddress?.address by consumers
        // but the address itself will never be undefined, only the inboundAddress
        (maybeInboundAddressResponse && !maybeInboundAddressResponse.address)
      )
        return Err(
          makeSwapErrorRight({
            message: `[getInboundAddressDataForChain]: No inbound address found for asset ${assetId}`,
            code: TradeQuoteError.QueryFailed,
          }),
        )

      return Ok(maybeInboundAddressResponse)
    })
}
