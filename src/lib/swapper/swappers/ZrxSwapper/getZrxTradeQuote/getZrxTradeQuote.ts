import { optimism } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { GetEvmTradeQuoteInput, SwapErrorRight, TradeQuote } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { normalizeAmount } from 'lib/swapper/swappers/utils/helpers/helpers'
import { getZrxMinMax } from 'lib/swapper/swappers/ZrxSwapper/getZrxMinMax/getZrxMinMax'
import type { ZrxPriceResponse } from 'lib/swapper/swappers/ZrxSwapper/types'
import {
  AFFILIATE_ADDRESS,
  DEFAULT_SOURCE,
  OPTIMISM_L1_SWAP_GAS_LIMIT,
} from 'lib/swapper/swappers/ZrxSwapper/utils/constants'
import {
  assertValidTradePair,
  assetToToken,
  baseUrlFromChainId,
  getTreasuryAddressForReceiveAsset,
} from 'lib/swapper/swappers/ZrxSwapper/utils/helpers/helpers'
import { zrxServiceFactory } from 'lib/swapper/swappers/ZrxSwapper/utils/zrxService'
import type { ZrxSupportedChainId } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper'
import { isEvmChainAdapter } from 'lib/utils'
import { convertBasisPointsToDecimalPercentage } from 'state/zustand/swapperStore/utils'

export async function getZrxTradeQuote<T extends ZrxSupportedChainId>(
  input: GetEvmTradeQuoteInput,
): Promise<Result<TradeQuote<T>, SwapErrorRight>> {
  const { sellAsset, buyAsset, accountNumber, receiveAddress, affiliateBps, chainId } = input
  const sellAmount = input.sellAmountBeforeFeesCryptoBaseUnit

  const adapterManager = getChainAdapterManager()
  const adapter = adapterManager.get(chainId)

  if (!adapter || !isEvmChainAdapter(adapter)) {
    return Err(
      makeSwapErrorRight({
        message: 'Invalid chain adapter',
        code: SwapErrorType.UNSUPPORTED_CHAIN,
        details: { adapter },
      }),
    )
  }

  const assertion = assertValidTradePair({ adapter, buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const maybeBaseUrl = baseUrlFromChainId(buyAsset.chainId)
  if (maybeBaseUrl.isErr()) return Err(maybeBaseUrl.unwrapErr())
  const zrxService = zrxServiceFactory({ baseUrl: maybeBaseUrl.unwrap() })

  const maybeZrxMinMax = await getZrxMinMax(sellAsset, buyAsset)
  if (maybeZrxMinMax.isErr()) {
    return Err(maybeZrxMinMax.unwrapErr())
  }
  const { minimumAmountCryptoHuman, maximumAmountCryptoHuman } = maybeZrxMinMax.unwrap()

  const minQuoteSellAmountCryptoBaseUnit = bnOrZero(minimumAmountCryptoHuman)
    .times(bn(10).exponentiatedBy(sellAsset.precision))
    .toFixed(0)

  const normalizedSellAmount = normalizeAmount(
    bnOrZero(sellAmount).eq(0) ? minQuoteSellAmountCryptoBaseUnit : sellAmount,
  )

  const buyTokenPercentageFee = convertBasisPointsToDecimalPercentage(affiliateBps).toNumber()
  const feeRecipient = getTreasuryAddressForReceiveAsset(buyAsset.assetId)

  // https://docs.0x.org/0x-swap-api/api-references/get-swap-v1-price
  const maybeZrxPriceResponse = (
    await zrxService.get<ZrxPriceResponse>('/swap/v1/price', {
      params: {
        buyToken: assetToToken(buyAsset),
        sellToken: assetToToken(sellAsset),
        sellAmount: normalizedSellAmount,
        takerAddress: receiveAddress,
        affiliateAddress: AFFILIATE_ADDRESS, // Used for 0x analytics
        skipValidation: true,
        feeRecipient, // Where affiliate fees are sent
        buyTokenPercentageFee,
      },
    })
  ).andThen(({ data }) => Ok(data))

  if (maybeZrxPriceResponse.isErr()) return Err(maybeZrxPriceResponse.unwrapErr())

  const data = maybeZrxPriceResponse.unwrap()

  const useSellAmount = !!sellAmount
  const rate = useSellAmount ? data.price : bn(1).div(data.price).toString()

  // add gas limit buffer to account for the fact we perform all of our validation on the trade quote estimations
  // which are inaccurate and not what we use for the tx to broadcast
  const gasLimit = bnOrZero(data.gas).times(1.2)

  // 0x approvals are cheaper than trades, but we don't have dynamic quote data for them.
  // Instead, we use a hardcoded gasLimit estimate in place of the estimatedGas in the 0x quote response.
  const txFee = await (async () => {
    if (optimism.isOptimismChainAdapter(adapter)) {
      const { average, l1GasPrice } = await adapter.getGasFeeData()

      // account for l1 transaction fees for optimism
      const l1TxFee = bn(OPTIMISM_L1_SWAP_GAS_LIMIT).times(l1GasPrice)

      return gasLimit.times(average.gasPrice).plus(l1TxFee)
    }

    const { average } = await adapter.getGasFeeData()

    const txFee = gasLimit.times(average.gasPrice)

    return txFee
  })()

  const tradeQuote: TradeQuote<ZrxSupportedChainId> = {
    allowanceContract: data.allowanceTarget,
    minimumCryptoHuman: minimumAmountCryptoHuman,
    maximumCryptoHuman: maximumAmountCryptoHuman,
    steps: [
      {
        buyAsset,
        sellAsset,
        accountNumber,
        rate,
        feeData: {
          networkFeeCryptoBaseUnit: txFee.toFixed(0),
          protocolFees: {},
        },
        buyAmountBeforeFeesCryptoBaseUnit: data.buyAmount,
        sellAmountBeforeFeesCryptoBaseUnit: data.sellAmount,
        sources: data.sources?.filter(s => parseFloat(s.proportion) > 0) || DEFAULT_SOURCE,
      },
    ],
  }

  return Ok(tradeQuote as TradeQuote<T>)
}
