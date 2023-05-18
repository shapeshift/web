import { Collapse, Flex } from '@chakra-ui/react'
import { DEFAULT_SLIPPAGE } from 'constants/constants'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { selectCryptoMarketData } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { selectBuyAssetUsdRate } from 'state/zustand/swapperStore/amountSelectors'
import {
  selectActiveSwapperWithMetadata,
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
  const activeSwapperWithMetadata = useSwapperStore(selectActiveSwapperWithMetadata)
  const activeSwapperName = activeSwapperWithMetadata?.swapper.name
  const buyAsset = useSwapperStore(selectBuyAsset)
  const cryptoMarketDataById = useAppSelector(selectCryptoMarketData)

  const bestQuote = availableSwappersWithMetadata?.[0]?.quote
  const bestBuyAmountCryptoPrecision =
    bestQuote &&
    fromBaseUnit(bestQuote.buyAmountBeforeFeesCryptoBaseUnit, bestQuote.buyAsset.precision)
  const bestBuyAmountCryptoPrecisionAfterSlippage = bnOrZero(bestBuyAmountCryptoPrecision)
    .times(bn(1).minus(bnOrZero(bestQuote?.recommendedSlippage ?? DEFAULT_SLIPPAGE)))
    .toString()

  const bestTotalProtocolFeeCryptoPrecision =
    bestQuote !== undefined
      ? sumProtocolFeesToDenom({
          cryptoMarketDataById,
          protocolFees: bestQuote.feeData.protocolFees,
          outputExponent: buyAsset.precision,
          outputAssetPriceUsd: buyAssetUsdRate,
        })
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
          ? fromBaseUnit(quote.buyAmountBeforeFeesCryptoBaseUnit, buyAsset.precision)
          : undefined

        const totalProtocolFeeCryptoPrecision = sumProtocolFeesToDenom({
          cryptoMarketDataById,
          protocolFees: quote.feeData.protocolFees,
          outputExponent: buyAsset.precision,
          outputAssetPriceUsd: buyAssetUsdRate,
        })

        const totalReceiveAmountCryptoPrecision = bnOrZero(buyAmountBeforeFeesCryptoPrecision)
          .minus(totalProtocolFeeCryptoPrecision)
          .times(bn(1).minus(bnOrZero(quote.recommendedSlippage ?? DEFAULT_SLIPPAGE)))
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
