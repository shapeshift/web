import type { AssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperName } from '../types'
import { TradeQuoteError } from '../types'
import { makeSwapErrorRight } from '../utils'
import { getPoolAssetId } from './index'
import { thorService } from './service'
import type { InboundAddressResponse } from './types'

export const getInboundAddressDataForChain = async (
  daemonUrl: string,
  assetId: AssetId | undefined,
  excludeHalted: boolean,
  swapperName: SwapperName,
): Promise<Result<InboundAddressResponse, SwapErrorRight>> => {
  if (!assetId) {
    return Err(
      makeSwapErrorRight({
        message: '[getInboundAddressDataForChain]: AssetId is required',
        code: TradeQuoteError.InternalError,
      }),
    )
  }

  const poolAssetId = getPoolAssetId({ assetId, swapperName })
  const assetChainSymbol = poolAssetId?.slice(0, poolAssetId.indexOf('.'))

  return (await thorService.get<InboundAddressResponse[]>(`${daemonUrl}/inbound_addresses`))
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
