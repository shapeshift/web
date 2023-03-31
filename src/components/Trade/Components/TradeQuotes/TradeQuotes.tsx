import { Collapse, Flex } from '@chakra-ui/react'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { selectSellAmountBeforeFeesBuyAssetBaseUnit } from 'state/zustand/swapperStore/amountSelectors'
import {
  selectActiveSwapperWithMetadata,
  selectAvailableSwappersWithMetadata,
  selectBuyAsset,
  selectBuyAssetFiatRate,
} from 'state/zustand/swapperStore/selectors'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

import { TradeQuote } from './TradeQuote'

type TradeQuotesProps = {
  isOpen?: boolean
  isLoading?: boolean
}

export const TradeQuotes: React.FC<TradeQuotesProps> = ({ isOpen, isLoading }) => {
  const buyAssetFiatRate = useSwapperStore(selectBuyAssetFiatRate)
  const availableSwappersWithMetadata = useSwapperStore(selectAvailableSwappersWithMetadata)
  const activeSwapperWithMetadata = useSwapperStore(selectActiveSwapperWithMetadata)
  const activeSwapperName = activeSwapperWithMetadata?.swapper.name
  const buyAsset = useSwapperStore(selectBuyAsset)

  const bestQuote = availableSwappersWithMetadata?.[0]?.quote
  const bestBuyAmountCryptoPrecision =
    bestQuote && fromBaseUnit(bestQuote.buyAmountCryptoBaseUnit, bestQuote.buyAsset.precision)
  const bestBuyAssetTradeFeeCryptoPrecision =
    buyAssetFiatRate && bestQuote
      ? bnOrZero(bestQuote.feeData.buyAssetTradeFeeUsd).div(buyAssetFiatRate)
      : undefined
  const bestTotalReceiveAmountCryptoPrecision = bestBuyAssetTradeFeeCryptoPrecision
    ? bnOrZero(bestBuyAmountCryptoPrecision).minus(bestBuyAssetTradeFeeCryptoPrecision).toString()
    : undefined

  const sellAmountBeforeFeesBuyAssetBaseUnit = useSwapperStore(
    selectSellAmountBeforeFeesBuyAssetBaseUnit,
  )

  const quotes = availableSwappersWithMetadata
    ? availableSwappersWithMetadata.map((swapperWithMetadata, i) => {
        const quote = swapperWithMetadata.quote
        const buyAmountBeforeFeesCryptoPrecision =
          sellAmountBeforeFeesBuyAssetBaseUnit && buyAsset
            ? fromBaseUnit(sellAmountBeforeFeesBuyAssetBaseUnit, buyAsset.precision)
            : undefined

        const buyAssetTradeFeeBuyAssetCryptoPrecision = buyAssetFiatRate
          ? bnOrZero(quote.feeData.buyAssetTradeFeeUsd).div(buyAssetFiatRate)
          : undefined

        const sellAssetTradeFeeBuyCryptoPrecision = buyAssetFiatRate
          ? bnOrZero(quote.feeData.sellAssetTradeFeeUsd).div(buyAssetFiatRate)
          : undefined

        const totalReceiveAmountCryptoPrecision = bnOrZero(buyAmountBeforeFeesCryptoPrecision)
          .minus(buyAssetTradeFeeBuyAssetCryptoPrecision ?? 0)
          .minus(sellAssetTradeFeeBuyCryptoPrecision ?? 0)
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
