import { Collapse, Flex } from '@chakra-ui/react'
import { getDefaultSlippagePercentageForSwapper } from 'constants/constants'
import { useMemo } from 'react'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import {
  selectActiveSwapperName,
  selectAvailableSwappersWithMetadata,
  selectBuyAsset,
} from 'state/zustand/swapperStore/selectors'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'
import { sumProtocolFeesForAssetCryptoBaseUnit } from 'state/zustand/swapperStore/utils'

import { TradeQuote } from './TradeQuote'

type TradeQuotesProps = {
  isOpen?: boolean
  isLoading?: boolean
}

export const TradeQuotes: React.FC<TradeQuotesProps> = ({ isOpen, isLoading }) => {
  const availableSwappersWithMetadata = useSwapperStore(selectAvailableSwappersWithMetadata)
  const activeSwapperName = useSwapperStore(selectActiveSwapperName)
  const buyAsset = useSwapperStore(selectBuyAsset)

  const bestTotalReceiveAmountCryptoPrecision = useMemo(() => {
    const { quote: bestQuote, swapper: bestSwapper } = availableSwappersWithMetadata?.[0] ?? {}

    if (!bestQuote) return

    const bestBuyAmountCryptoPrecision = fromBaseUnit(
      bestQuote.steps[bestQuote.steps.length - 1].buyAmountBeforeFeesCryptoBaseUnit,
      buyAsset.precision,
    )

    const slippageDecimalPercentage =
      bestQuote.recommendedSlippage ?? getDefaultSlippagePercentageForSwapper(bestSwapper?.name)

    const bestBuyAmountCryptoPrecisionAfterSlippage = bnOrZero(bestBuyAmountCryptoPrecision)
      .times(bn(1).minus(bnOrZero(slippageDecimalPercentage)))
      .toString()

    const bestTotalProtocolFeeBuyAssetCryptoPrecision = sumProtocolFeesForAssetCryptoBaseUnit(
      buyAsset,
      bestQuote.steps,
      false,
    )

    return bnOrZero(bestBuyAmountCryptoPrecisionAfterSlippage)
      .minus(bestTotalProtocolFeeBuyAssetCryptoPrecision)
      .toString()
  }, [availableSwappersWithMetadata, buyAsset])

  const quotes = useMemo(
    () =>
      availableSwappersWithMetadata
        ? availableSwappersWithMetadata.map((swapperWithMetadata, i) => {
            const quote = swapperWithMetadata.quote
            const buyAmountBeforeFeesCryptoPrecision = buyAsset
              ? fromBaseUnit(
                  quote.steps[quote.steps.length - 1].buyAmountBeforeFeesCryptoBaseUnit,
                  buyAsset.precision,
                )
              : undefined

            const totalProtocolFeeBuyAssetCryptoPrecision = fromBaseUnit(
              sumProtocolFeesForAssetCryptoBaseUnit(buyAsset, quote.steps, false),
              buyAsset.precision,
            )

            const totalReceiveAmountCryptoPrecision = bnOrZero(buyAmountBeforeFeesCryptoPrecision)
              .minus(totalProtocolFeeBuyAssetCryptoPrecision)
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
        : null,
    [
      activeSwapperName,
      availableSwappersWithMetadata,
      bestTotalReceiveAmountCryptoPrecision,
      buyAsset,
      isLoading,
    ],
  )

  return (
    <Collapse in={isOpen}>
      <Flex flexDir='column' gap={2} width='full' px={4} py={2}>
        {quotes}
      </Flex>
    </Collapse>
  )
}
