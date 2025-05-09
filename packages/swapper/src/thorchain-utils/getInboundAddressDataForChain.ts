import type { AssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import * as mayachain from '../swappers/MayachainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import * as thorchain from '../swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import type { SwapErrorRight } from '../types'
import { SwapperName, TradeQuoteError } from '../types'
import { makeSwapErrorRight } from '../utils'
import { service } from './service'
import type { InboundAddressResponse } from './types'

export const getInboundAddressDataForChain = async (
  url: string,
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

  const assetPoolId = (() => {
    switch (swapperName) {
      case SwapperName.Thorchain:
        return thorchain.assetIdToPoolAssetId({ assetId })
      case SwapperName.Mayachain:
        return mayachain.assetIdToPoolAssetId({ assetId })
      default:
        throw new Error(`Invalid swapper: ${swapperName}`)
    }
  })()

  const assetChainSymbol = assetPoolId?.slice(0, assetPoolId.indexOf('.'))

  return (await service.get<InboundAddressResponse[]>(`${url}/inbound_addresses`))
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
