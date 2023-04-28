import { optimism } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { GetEvmTradeQuoteInput, SwapErrorRight, TradeQuote } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType } from 'lib/swapper/api'
import { APPROVAL_GAS_LIMIT } from 'lib/swapper/swappers/utils/constants'
import { normalizeAmount } from 'lib/swapper/swappers/utils/helpers/helpers'
import { getZrxMinMax } from 'lib/swapper/swappers/ZrxSwapper/getZrxMinMax/getZrxMinMax'
import type { ZrxPriceResponse, ZrxSwapperDeps } from 'lib/swapper/swappers/ZrxSwapper/types'
import {
  AFFILIATE_ADDRESS,
  DEFAULT_SOURCE,
  OPTIMISM_L1_APPROVE_GAS_LIMIT,
  OPTIMISM_L1_SWAP_GAS_LIMIT,
} from 'lib/swapper/swappers/ZrxSwapper/utils/constants'
import {
  assertValidTradePair,
  assetToToken,
  baseUrlFromChainId,
} from 'lib/swapper/swappers/ZrxSwapper/utils/helpers/helpers'
import { zrxServiceFactory } from 'lib/swapper/swappers/ZrxSwapper/utils/zrxService'
import type { ZrxSupportedChainId } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper'

export async function getZrxTradeQuote<T extends ZrxSupportedChainId>(
  { adapter }: ZrxSwapperDeps,
  input: GetEvmTradeQuoteInput,
): Promise<Result<TradeQuote<T>, SwapErrorRight>> {
  try {
    const { sellAsset, buyAsset, accountNumber, receiveAddress } = input
    const sellAmount = input.sellAmountBeforeFeesCryptoBaseUnit

    const assertion = assertValidTradePair({ adapter, buyAsset, sellAsset })
    if (assertion.isErr()) return Err(assertion.unwrapErr())

    const baseUrl = baseUrlFromChainId(buyAsset.chainId)
    const zrxService = zrxServiceFactory(baseUrl)

    const { minimumAmountCryptoHuman, maximumAmountCryptoHuman } = await getZrxMinMax(
      sellAsset,
      buyAsset,
    )
    const minQuoteSellAmountCryptoBaseUnit = bnOrZero(minimumAmountCryptoHuman).times(
      bn(10).exponentiatedBy(sellAsset.precision),
    )

    const normalizedSellAmount = normalizeAmount(
      bnOrZero(sellAmount).eq(0) ? minQuoteSellAmountCryptoBaseUnit : sellAmount,
    )

    // https://docs.0x.org/0x-swap-api/api-references/get-swap-v1-price
    const { data } = await zrxService.get<ZrxPriceResponse>('/swap/v1/price', {
      params: {
        buyToken: assetToToken(buyAsset),
        sellToken: assetToToken(sellAsset),
        sellAmount: normalizedSellAmount,
        takerAddress: receiveAddress,
        affiliateAddress: AFFILIATE_ADDRESS,
        skipValidation: true,
      },
    })

    if (!data) {
      return Err(
        makeSwapErrorRight({
          message: '[getZrxTradeQuote] Bad ZRX response, no data was returned',
          code: SwapErrorType.TRADE_QUOTE_FAILED,
        }),
      )
    }

    const useSellAmount = !!sellAmount
    const rate = useSellAmount ? data.price : bn(1).div(data.price).toString()

    // add gas limit buffer to account for the fact we perform all of our validation on the trade quote estimations
    // which are inaccurate and not what we use for the tx to broadcast
    const gasLimit = bnOrZero(data.gas).times(1.2)

    // 0x approvals are cheaper than trades, but we don't have dynamic quote data for them.
    // Instead, we use a hardcoded gasLimit estimate in place of the estimatedGas in the 0x quote response.
    const { average, approvalFee, txFee } = await (async () => {
      if (optimism.isOptimismChainAdapter(adapter)) {
        const { average, l1GasPrice } = await adapter.getGasFeeData()

        // account for l1 transaction fees for optimism
        const l1ApprovalFee = bn(OPTIMISM_L1_APPROVE_GAS_LIMIT).times(l1GasPrice)
        const l1TxFee = bn(OPTIMISM_L1_SWAP_GAS_LIMIT).times(l1GasPrice)

        return {
          average,
          approvalFee: bn(APPROVAL_GAS_LIMIT).times(average.gasPrice).plus(l1ApprovalFee),
          txFee: gasLimit.times(average.gasPrice).plus(l1TxFee),
        }
      }

      const { average } = await adapter.getGasFeeData()

      const approvalFee = bn(APPROVAL_GAS_LIMIT).times(average.gasPrice)
      const txFee = gasLimit.times(average.gasPrice)

      return { average, approvalFee, txFee }
    })()

    const tradeQuote: TradeQuote<ZrxSupportedChainId> = {
      buyAsset,
      sellAsset,
      accountNumber,
      rate,
      minimumCryptoHuman: minimumAmountCryptoHuman,
      maximumCryptoHuman: maximumAmountCryptoHuman,
      feeData: {
        chainSpecific: {
          estimatedGasCryptoBaseUnit: gasLimit.toFixed(0),
          gasPriceCryptoBaseUnit: average.gasPrice,
          maxFeePerGas: average.maxFeePerGas,
          maxPriorityFeePerGas: average.maxPriorityFeePerGas,
          approvalFeeCryptoBaseUnit: approvalFee.toFixed(0),
        },
        networkFeeCryptoBaseUnit: txFee.toFixed(0),
        buyAssetTradeFeeUsd: '0',
        sellAssetTradeFeeUsd: '0',
      },
      allowanceContract: data.allowanceTarget,
      buyAmountCryptoBaseUnit: data.buyAmount,
      sellAmountBeforeFeesCryptoBaseUnit: data.sellAmount,
      sources: data.sources?.filter(s => parseFloat(s.proportion) > 0) || DEFAULT_SOURCE,
    }

    return Ok(tradeQuote as TradeQuote<T>)
  } catch (e) {
    // TODO(gomes): scrutinize what can throw above and don't throw, because monads
    if (e instanceof SwapError)
      return Err(
        makeSwapErrorRight({
          message: e.message,
          code: e.code,
          details: e.details,
        }),
      )
    return Err(
      makeSwapErrorRight({
        message: '[getZrxTradeQuote]',
        cause: e,
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )
  }
}
