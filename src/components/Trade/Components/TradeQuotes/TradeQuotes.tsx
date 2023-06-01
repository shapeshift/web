import { Collapse, Flex } from '@chakra-ui/react'
import { getDefaultSlippagePercentageForSwapper } from 'constants/constants'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { selectCryptoMarketData } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { selectBuyAssetUsdRate } from 'state/zustand/swapperStore/amountSelectors'
import {
  selectActiveSwapperName,
  selectAvailableSwappersWithMetadata,
  selectBuyAsset,
} from 'state/zustand/swapperStore/selectors'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'
import { sumProtocolFeesToDenom } from 'state/zustand/swapperStore/utils'

import { TradeQuote } from './TradeQuote'

type TradeQuotesProps = {
  isOpen?: boolean
  isLoading?: boolean
}

export const TradeQuotes: React.FC<TradeQuotesProps> = ({ isOpen, isLoading }) => {
  const buyAssetUsdRate = useSwapperStore(selectBuyAssetUsdRate)
  const availableSwappersWithMetadata = useSwapperStore(selectAvailableSwappersWithMetadata)
  const activeSwapperName = useSwapperStore(selectActiveSwapperName)
  const buyAsset = useSwapperStore(selectBuyAsset)
  const cryptoMarketDataById = useAppSelector(selectCryptoMarketData)

  const { quote: bestQuote, swapper: bestSwapper } = availableSwappersWithMetadata?.[0] ?? {}

  const bestBuyAmountCryptoPrecision =
    bestQuote &&
    fromBaseUnit(
      bestQuote.steps[0].buyAmountBeforeFeesCryptoBaseUnit,
      bestQuote.steps[0].buyAsset.precision,
    )
  const slippageDecimalPercentage =
    bestQuote?.recommendedSlippage ?? getDefaultSlippagePercentageForSwapper(bestSwapper?.name)
  const bestBuyAmountCryptoPrecisionAfterSlippage = bnOrZero(bestBuyAmountCryptoPrecision)
    .times(bn(1).minus(bnOrZero(slippageDecimalPercentage)))
    .toString()

  const bestTotalProtocolFeeCryptoPrecision =
    bestQuote !== undefined
      ? fromBaseUnit(
          sumProtocolFeesToDenom({
            cryptoMarketDataById,
            protocolFees: bestQuote.steps[0].feeData.protocolFees,
            outputExponent: buyAsset.precision,
            outputAssetPriceUsd: buyAssetUsdRate,
          }),
          buyAsset.precision,
        )
      : '0'

  const bestTotalReceiveAmountCryptoPrecision = bestQuote
    ? bnOrZero(bestBuyAmountCryptoPrecisionAfterSlippage)
        .minus(bestTotalProtocolFeeCryptoPrecision)
        .toString()
    : undefined

  const quotes = availableSwappersWithMetadata
    ? availableSwappersWithMetadata.map((swapperWithMetadata, i) => {
        const quote = swapperWithMetadata.quote
        const buyAmountBeforeFeesCryptoPrecision = buyAsset
          ? fromBaseUnit(quote.steps[0].buyAmountBeforeFeesCryptoBaseUnit, buyAsset.precision)
          : undefined

        const totalProtocolFeeCryptoPrecision = fromBaseUnit(
          sumProtocolFeesToDenom({
            cryptoMarketDataById,
            protocolFees: quote.steps[0].feeData.protocolFees,
            outputExponent: buyAsset.precision,
            outputAssetPriceUsd: buyAssetUsdRate,
          }),
          buyAsset.precision,
        )

        const totalReceiveAmountCryptoPrecision = bnOrZero(buyAmountBeforeFeesCryptoPrecision)
          .minus(totalProtocolFeeCryptoPrecision)
          .times(
            bn(1).minus(
              bnOrZero(
                quote.recommendedSlippage ??
                  getDefaultSlippagePercentageForSwapper(swapperWithMetadata.swapper.name),
              ),
            ),
          )
          .toString()

        const isActive = activeSwapperName === swapperWithMetadata.swapper.name
        const quoteDifference = bn(1)
          .minus(
            bnOrZero(totalReceiveAmountCryptoPrecision).div(
              bestTotalReceiveAmountCryptoPrecision ?? 1,
            ),
          )
          .toString()
        return (
          <TradeQuote
            key={swapperWithMetadata.swapper.name}
            isBest={i === 0}
            isLoading={isLoading}
            isActive={isActive}
            swapperWithMetadata={swapperWithMetadata}
            quoteDifference={quoteDifference}
            totalReceiveAmountCryptoPrecision={totalReceiveAmountCryptoPrecision}
          />
        )
      })
    : null

  return (
    <Collapse in={isOpen}>
      <Flex flexDir='column' gap={2} width='full' px={4} py={2}>
        {quotes}
      </Flex>
    </Collapse>
  )
}
