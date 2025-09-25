import { InfoIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Flex,
  HStack,
  Skeleton,
  Stack,
  Text as CText,
} from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { bnOrZero } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { NumberFormatValues } from 'react-number-format'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'

import { AmountInput } from '../../TradeAmountInput'

import { Amount } from '@/components/Amount/Amount'
import { StyledAssetMenuButton } from '@/components/AssetSelection/components/AssetMenuButton'
import { SwapIcon } from '@/components/Icons/SwapIcon'
import { Text } from '@/components/Text'
import { useActions } from '@/hooks/useActions'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { bn } from '@/lib/bignumber/bignumber'
import { LimitPriceMode, PriceDirection } from '@/state/slices/limitOrderInputSlice/constants'
import { limitOrderInput } from '@/state/slices/limitOrderInputSlice/limitOrderInputSlice'
import {
  selectInputSellAmountCryptoPrecision,
  selectLimitPrice,
  selectLimitPriceDirection,
  selectLimitPriceForSelectedPriceDirection,
} from '@/state/slices/limitOrderInputSlice/selectors'
import { allowedDecimalSeparators } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'
import { clickableLinkSx } from '@/theme/styles'

const swapIcon = <SwapIcon />
const disabledProps = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }
const swapPriceButtonProps = { pr: 4, _disabled: disabledProps }

type LimitOrderConfigProps = {
  sellAsset: Asset
  buyAsset: Asset
  isLoading: boolean
  marketPriceBuyAsset: string
  networkFeesImpactDecimalPercentage?: string | undefined
  networkFeesImpactCryptoPrecision?: string | undefined
}

export const LimitOrderConfig = ({
  sellAsset,
  buyAsset,
  isLoading,
  marketPriceBuyAsset,
  networkFeesImpactDecimalPercentage,
  networkFeesImpactCryptoPrecision,
}: LimitOrderConfigProps) => {
  const translate = useTranslate()
  const priceAmountRef = useRef<string | null>(null)
  const [isInputtingFiatSellAmount, setIsInputtingFiatSellAmount] = useState(false)

  const limitPriceForSelectedPriceDirection = useAppSelector(
    selectLimitPriceForSelectedPriceDirection,
  )
  const limitPrice = useAppSelector(selectLimitPrice)
  const priceDirection = useAppSelector(selectLimitPriceDirection)

  const { setLimitPriceDirection, setLimitPrice, setLimitPriceMode } = useActions(
    limitOrderInput.actions,
  )

  const {
    number: { localeParts },
  } = useLocaleFormatter()

  const priceAsset = useMemo(() => {
    return priceDirection === PriceDirection.BuyAssetDenomination ? buyAsset : sellAsset
  }, [buyAsset, priceDirection, sellAsset])

  const priceAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, priceAsset.assetId),
  )

  const fiatValue = useMemo(
    () =>
      bnOrZero(limitPriceForSelectedPriceDirection)
        .times(bnOrZero(priceAssetMarketData?.price))
        .toString(),
    [limitPriceForSelectedPriceDirection, priceAssetMarketData?.price],
  )

  const limitPriceCryptoPrecision = useMemo(() => {
    return bnOrZero(limitPriceForSelectedPriceDirection).toFixed(priceAsset.precision)
  }, [limitPriceForSelectedPriceDirection, priceAsset.precision])

  const inputValue = useMemo(() => {
    if (isInputtingFiatSellAmount) {
      if (!fiatValue || (bnOrZero(fiatValue).isZero() && !priceAmountRef.current)) {
        return ''
      }

      return bnOrZero(fiatValue).toFixed(2)
    }

    if (
      !limitPriceForSelectedPriceDirection ||
      (bnOrZero(limitPriceForSelectedPriceDirection).isZero() && !priceAmountRef.current)
    )
      return ''

    return bnOrZero(limitPriceForSelectedPriceDirection).toFixed(priceAsset.precision)
  }, [
    limitPriceForSelectedPriceDirection,
    priceAsset.precision,
    fiatValue,
    isInputtingFiatSellAmount,
    priceAmountRef,
  ])

  const handleSetPresetLimit = useCallback(
    (limitPriceMode: LimitPriceMode) => {
      if (limitPriceMode === LimitPriceMode.CustomValue) return

      setLimitPriceMode(limitPriceMode)
      setLimitPrice({ marketPriceBuyAsset })
    },
    [marketPriceBuyAsset, setLimitPrice, setLimitPriceMode],
  )

  const handleSetMarketLimit = useCallback(() => {
    handleSetPresetLimit(LimitPriceMode.Market)
  }, [handleSetPresetLimit])

  const handleTogglePriceDirection = useCallback(() => {
    const newPriceDirection =
      priceDirection === PriceDirection.BuyAssetDenomination
        ? PriceDirection.SellAssetDenomination
        : PriceDirection.BuyAssetDenomination
    setLimitPriceDirection(newPriceDirection)
  }, [priceDirection, setLimitPriceDirection])

  const handleToggleFiatSellAmount = useCallback(() => {
    setIsInputtingFiatSellAmount(prev => !prev)
  }, [])

  const handleInputChange = useCallback(
    (value: string | null, isFiatValue?: boolean) => {
      if (isFiatValue !== undefined) {
        setIsInputtingFiatSellAmount(isFiatValue)
      }

      let cryptoValue = value
      if (isInputtingFiatSellAmount || isFiatValue) {
        cryptoValue = bnOrZero(value)
          .div(bnOrZero(priceAssetMarketData?.price))
          .toFixed(priceAsset.precision)
      }

      setLimitPriceMode(LimitPriceMode.CustomValue)
      setLimitPrice({ marketPriceBuyAsset: cryptoValue ?? '0' })
    },
    [
      isInputtingFiatSellAmount,
      priceAssetMarketData?.price,
      priceAsset.precision,
      setLimitPrice,
      setLimitPriceMode,
    ],
  )

  const handleValueChange = useCallback((values: NumberFormatValues) => {
    priceAmountRef.current = values.value
  }, [])

  const oppositeCurrency = useMemo(() => {
    return isInputtingFiatSellAmount ? (
      <Amount.Crypto value={limitPriceCryptoPrecision} symbol={priceAsset.symbol} prefix='≈' />
    ) : (
      <Amount.Fiat value={fiatValue} prefix='≈' />
    )
  }, [fiatValue, isInputtingFiatSellAmount, priceAsset.symbol, limitPriceCryptoPrecision])

  const delta = useMemo(
    () => bn(limitPrice.buyAssetDenomination).div(marketPriceBuyAsset).minus(1).times(100),
    [limitPrice.buyAssetDenomination, marketPriceBuyAsset],
  )

  const isMarketButtonDisabled = useMemo(() => {
    if (isLoading) return true
    if (bnOrZero(marketPriceBuyAsset).isZero()) return true

    const marketPriceMinusOnePercent = bnOrZero(marketPriceBuyAsset).times(0.999)
    const marketPricePlusOnePercent = bnOrZero(marketPriceBuyAsset).times(1.001)

    if (priceDirection === PriceDirection.BuyAssetDenomination) {
      return (
        bnOrZero(limitPriceCryptoPrecision).gt(marketPriceMinusOnePercent) &&
        bnOrZero(limitPriceCryptoPrecision).lt(marketPricePlusOnePercent)
      )
    }

    const invertedPrice = bnOrZero(1).div(limitPriceCryptoPrecision)

    return (
      invertedPrice.gt(marketPriceMinusOnePercent) && invertedPrice.lt(marketPricePlusOnePercent)
    )
  }, [isLoading, limitPriceCryptoPrecision, marketPriceBuyAsset, priceDirection])

  const maybePriceWarning = useMemo(() => {
    if (
      bnOrZero(limitPrice.buyAssetDenomination).isZero() ||
      bnOrZero(marketPriceBuyAsset).isZero()
    )
      return null
    if (isLoading) return null
    if (delta.gte(0)) return null

    return (
      <Alert status='warning'>
        <Flex direction='column' gap={2}>
          <Flex alignItems='center'>
            <AlertIcon boxSize='20px' />
            <AlertTitle>
              {translate('limitOrder.limitPriceIsPercentLowerThanMarket', {
                percent: delta.abs().toFixed(2),
              })}
            </AlertTitle>
          </Flex>
          <Text
            pl={7}
            // eslint-disable-next-line react-memo/require-usememo
            translation={[
              'limitOrder.warnings.limitPriceIsPercentLowerThanMarket',
              {
                percent: delta.abs().toFixed(2),
                sellAssetSymbol: sellAsset.symbol,
              },
            ]}
          />
        </Flex>
      </Alert>
    )
  }, [
    delta,
    isLoading,
    limitPrice.buyAssetDenomination,
    marketPriceBuyAsset,
    sellAsset.symbol,
    translate,
  ])

  const displayAsset = useMemo(() => {
    return priceDirection === PriceDirection.BuyAssetDenomination ? sellAsset : buyAsset
  }, [buyAsset, priceDirection, sellAsset])

  const handleTokenTextClick = useCallback(() => {
    handleTogglePriceDirection()
  }, [handleTogglePriceDirection])

  const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)

  const handleInputValueChange = useCallback(() => {
    handleInputChange(priceAmountRef.current)
  }, [handleInputChange])

  const receiveAmountFormatted = useMemo(() => {
    if (
      bnOrZero(sellAmountCryptoPrecision).isZero() ||
      bnOrZero(limitPrice.buyAssetDenomination).isZero()
    ) {
      return '0'
    }

    if (priceDirection === PriceDirection.BuyAssetDenomination) {
      return bnOrZero(sellAmountCryptoPrecision).times(limitPrice.buyAssetDenomination).toString()
    }

    return bnOrZero(sellAmountCryptoPrecision).div(limitPrice.sellAssetDenomination).toString()
  }, [limitPrice, priceDirection, sellAmountCryptoPrecision])

  const assetSymbol = useMemo(
    () =>
      priceDirection === PriceDirection.BuyAssetDenomination ? sellAsset.symbol : buyAsset.symbol,
    [priceDirection, sellAsset.symbol, buyAsset.symbol],
  )

  const humanReadableExplanationComponents = useMemo(
    () => ({
      assetSymbol: (
        <CText as='span' color='white' fontWeight='medium'>
          {assetSymbol}
        </CText>
      ),
      limitPrice: (
        <Amount.Crypto
          as='span'
          color='white'
          fontWeight='medium'
          value={limitPriceForSelectedPriceDirection}
          symbol={priceAsset.symbol}
          omitDecimalTrailingZeros
        />
      ),
      sellAmount: (
        <Amount.Crypto
          as='span'
          color='white'
          fontWeight='medium'
          value={sellAmountCryptoPrecision}
          symbol={sellAsset.symbol}
          omitDecimalTrailingZeros
        />
      ),
      receiveAmount: (
        <Amount.Crypto
          as='span'
          color='white'
          fontWeight='medium'
          value={receiveAmountFormatted}
          symbol={buyAsset.symbol}
          omitDecimalTrailingZeros
        />
      ),
    }),
    [
      assetSymbol,
      limitPriceForSelectedPriceDirection,
      priceAsset.symbol,
      sellAmountCryptoPrecision,
      sellAsset.symbol,
      receiveAmountFormatted,
      buyAsset.symbol,
    ],
  )
  const limitOrderExplainer = useMemo(() => {
    if (
      isLoading ||
      bnOrZero(sellAmountCryptoPrecision).isZero() ||
      bnOrZero(limitPriceForSelectedPriceDirection).isZero()
    )
      return null

    return (
      <Text
        translation='limitOrder.explanation'
        components={humanReadableExplanationComponents}
        fontSize='sm'
        lineHeight='1.6'
        color='text.subtle'
      />
    )
  }, [
    isLoading,
    sellAmountCryptoPrecision,
    limitPriceForSelectedPriceDirection,
    humanReadableExplanationComponents,
  ])

  const maybeHighNetworkFeeWarning = useMemo(() => {
    if (bnOrZero(networkFeesImpactDecimalPercentage).gt('0.3')) {
      return (
        <Alert status='warning' mt={2} borderRadius='md'>
          <AlertIcon />
          <AlertTitle fontSize='sm'>
            {translate('limitOrder.highCowFeeImpact', {
              percentage: bnOrZero(networkFeesImpactDecimalPercentage).times(100).toFixed(0),
              sellAssetSymbol: sellAsset.symbol,
              cryptoImpact: networkFeesImpactCryptoPrecision,
            })}
          </AlertTitle>
        </Alert>
      )
    }
    return null
  }, [
    networkFeesImpactDecimalPercentage,
    networkFeesImpactCryptoPrecision,
    sellAsset.symbol,
    translate,
  ])

  const marketPriceCryptoPrecision = useMemo(() => {
    if (bnOrZero(marketPriceBuyAsset).isZero()) return '0'

    return priceDirection === PriceDirection.BuyAssetDenomination
      ? bnOrZero(marketPriceBuyAsset).toFixed(6)
      : bnOrZero(1).div(marketPriceBuyAsset).toFixed(6)
  }, [marketPriceBuyAsset, priceDirection])

  const marketPriceText = useMemo(() => {
    if (bnOrZero(marketPriceCryptoPrecision).isZero()) return 'N/A'

    return `${marketPriceCryptoPrecision} ${priceAsset.symbol}`
  }, [marketPriceCryptoPrecision, priceAsset.symbol])

  return (
    <Stack spacing={6} px={6} py={4}>
      <Flex justifyContent='space-between' alignItems='center'>
        <HStack>
          <Text translation='limitOrder.when' />
          <Button
            variant='unstyled'
            onClick={handleTokenTextClick}
            fontWeight='bold'
            fontSize='sm'
            sx={clickableLinkSx}
          >
            1 {displayAsset.symbol}
          </Button>
          <Text whiteSpace='nowrap' translation='limitOrder.isWorth' />
        </HStack>
        <Flex justifyContent='space-between' alignItems='center'>
          <Text
            translation='limitOrder.market'
            mr={2}
            fontSize='sm'
            opacity={isMarketButtonDisabled ? 0.5 : 1}
          />
          <Skeleton isLoaded={!isLoading}>
            <Button
              variant='unstyled'
              onClick={handleSetMarketLimit}
              isDisabled={isMarketButtonDisabled}
              fontWeight='medium'
              fontSize='sm'
              sx={clickableLinkSx}
              opacity={isMarketButtonDisabled ? 0.5 : 1}
              cursor={isMarketButtonDisabled ? 'not-allowed' : 'pointer'}
            >
              {marketPriceText}
            </Button>
          </Skeleton>
        </Flex>
      </Flex>
      <HStack width='full' justify='space-between' alignItems='flex-start'>
        <Skeleton isLoaded={!isLoading} minHeight={6}>
          <Flex direction='column' width='full'>
            <NumberFormat
              customInput={AmountInput}
              decimalScale={isInputtingFiatSellAmount ? 2 : priceAsset.precision}
              isNumericString={true}
              textOverflow='ellipsis'
              decimalSeparator={localeParts.decimal}
              inputMode='decimal'
              allowedDecimalSeparators={allowedDecimalSeparators}
              thousandSeparator={localeParts.group}
              placeholder={isInputtingFiatSellAmount ? '$0' : '0'}
              suffix={isInputtingFiatSellAmount ? localeParts.postfix : ''}
              prefix={isInputtingFiatSellAmount ? localeParts.prefix : ''}
              value={inputValue}
              onValueChange={handleValueChange}
              onChange={handleInputValueChange}
            />
            <Button
              onClick={handleToggleFiatSellAmount}
              size='sm'
              fontWeight='medium'
              variant='link'
              color='text.subtle'
              alignSelf='flex-start'
              mt={4}
            >
              {oppositeCurrency}
            </Button>
          </Flex>
        </Skeleton>
        <StyledAssetMenuButton
          rightIcon={swapIcon}
          assetId={priceAsset.assetId}
          buttonProps={swapPriceButtonProps}
          onAssetClick={handleTogglePriceDirection}
          isDisabled={isLoading}
        />
      </HStack>

      {!isLoading &&
        !bnOrZero(sellAmountCryptoPrecision).isZero() &&
        !bnOrZero(limitPriceForSelectedPriceDirection).isZero() && (
          <Box
            p={4}
            borderWidth='1px'
            borderStyle='dashed'
            borderRadius='md'
            borderColor='whiteAlpha.300'
          >
            <Flex alignItems='flex-start' direction='column'>
              <Flex alignItems='flex-start'>
                <Box as='span' mr={2} mt={1}>
                  <InfoIcon boxSize={5} color='gray.500' />
                </Box>
                {limitOrderExplainer}
              </Flex>
            </Flex>
          </Box>
        )}

      {maybeHighNetworkFeeWarning}
      {maybePriceWarning}
    </Stack>
  )
}
