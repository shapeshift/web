import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { MultiHopTradeQuote, SwapErrorRight, TradeQuote } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'
import { getConfig } from 'config'
import { isRune } from 'lib/swapper/swappers/ThorchainSwapper/utils/isRune/isRune'
import { getInboundAddressDataForChain } from 'lib/utils/thorchain/getInboundAddressDataForChain'

export const isTradingActive = async (
  assetId: AssetId | undefined,
  swapperName: SwapperName,
): Promise<Result<boolean, SwapErrorRight>> => {
  switch (swapperName) {
    case SwapperName.Thorchain: {
      const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
      const sellAssetIsRune = assetId && isRune(assetId)
      // no-op if the sell asset is RUNE to save a network call
      const maybeInboundAddressData = sellAssetIsRune
        ? Ok(undefined)
        : await getInboundAddressDataForChain(daemonUrl, assetId, false)

      if (maybeInboundAddressData.isErr()) return Err(maybeInboundAddressData.unwrapErr())
      const inboundAddressData = maybeInboundAddressData.unwrap()

      // We MUST get confirmation that trading is not halted. We fail-closed for safety.
      switch (true) {
        // The sell asset is RUNE, there is no inbound address data to check against
        // Check the HALTTHORCHAIN flag on the mimir endpoint instead
        case sellAssetIsRune: {
          const { data: mimir } = await axios.get<Record<string, unknown>>(
            `${daemonUrl}/lcd/thorchain/mimir`,
          )
          return Ok(Object.entries(mimir).some(([k, v]) => k === 'HALTTHORCHAIN' && v === 0))
        }
        // We have inboundAddressData for the sell asset, check if it is halted
        case !!inboundAddressData:
          return Ok(!inboundAddressData!.halted)
        // We have no inboundAddressData for the sell asset, fail-closed
        default:
          return Ok(false)
      }
    }
    // The swapper does not require any additional checks, we assume trading is active
    default:
      return Ok(true)
  }
}

// All chains currently support Tx history, but that might not be the case as we support more chains
export const chainSupportsTxHistory = (_chainId: ChainId): boolean => true

export const isMultiHopTradeQuote = (quote: TradeQuote): quote is MultiHopTradeQuote =>
  quote.steps.length > 1
