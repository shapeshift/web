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
import { useCallback, useMemo, useRef } from 'react'
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

const swapIcon = <SwapIcon />
const disabledProps = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }
const swapPriceButtonProps = { pr: 4, _disabled: disabledProps }

type LimitOrderConfigProps = {
  sellAsset: Asset
  buyAsset: Asset
  isLoading: boolean
  marketPriceBuyAsset: string
  isInputtingFiatSellAmount: boolean
  onChangeIsInputtingFiatSellAmount: (isInputtingFiatSellAmount: boolean) => void
}

const linkAfter = {
  content: '""',
  display: 'block',
  height: '1px',
  borderBottom: '1px dotted',
  borderColor: 'whiteAlpha.500',
  mb: '-2px',
}

const linkHover = {
  _after: {
    borderBottom: 'none',
    height: '2px',
  },
}

export const LimitOrderConfig = ({
  sellAsset,
  buyAsset,
  isLoading,
  marketPriceBuyAsset,
  isInputtingFiatSellAmount,
  onChangeIsInputtingFiatSellAmount,
}: LimitOrderConfigProps) => {
  const translate = useTranslate()
  const priceAmountRef = useRef<string | null>(null)

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
      bnOrZero(limitPriceForSelectedPriceDirection).times(priceAssetMarketData.price).toString(),
    [limitPriceForSelectedPriceDirection, priceAssetMarketData.price],
  )

  // Lower the decimal places when the integer is greater than 8 significant digits for better UI
  const priceCryptoFormatted = useMemo(() => {
    const cryptoAmountIntegerCount = bnOrZero(
      bnOrZero(limitPriceForSelectedPriceDirection).toFixed(0),
    ).precision(true)

    return cryptoAmountIntegerCount <= 8
      ? limitPriceForSelectedPriceDirection
      : bnOrZero(limitPriceForSelectedPriceDirection).toFixed(3)
  }, [limitPriceForSelectedPriceDirection])

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

  const handleInputChange = useCallback(
    (value: string, isFiatValue?: boolean) => {
      if (isFiatValue !== undefined) {
        onChangeIsInputtingFiatSellAmount(isFiatValue)
      }

      let cryptoValue = value
      if (isInputtingFiatSellAmount || isFiatValue) {
        cryptoValue = bnOrZero(value).div(priceAssetMarketData.price).toString()
      }

      priceAmountRef.current = cryptoValue
      setLimitPriceMode(LimitPriceMode.CustomValue)
      setLimitPrice({ marketPriceBuyAsset: cryptoValue })
    },
    [
      isInputtingFiatSellAmount,
      priceAssetMarketData.price,
      setLimitPrice,
      setLimitPriceMode,
      onChangeIsInputtingFiatSellAmount,
    ],
  )

  const handleValueChange = useCallback((values: NumberFormatValues) => {
    priceAmountRef.current = values.value
  }, [])

  const oppositeCurrency = useMemo(() => {
    return isInputtingFiatSellAmount ? (
      <Amount.Crypto value={priceCryptoFormatted} symbol={priceAsset.symbol} prefix='≈' />
    ) : (
      <Amount.Fiat value={fiatValue} prefix='≈' />
    )
  }, [fiatValue, isInputtingFiatSellAmount, priceAsset.symbol, priceCryptoFormatted])

  const delta = useMemo(
    () => bn(limitPrice.buyAssetDenomination).div(marketPriceBuyAsset).minus(1).times(100),
    [limitPrice.buyAssetDenomination, marketPriceBuyAsset],
  )

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

  const handleToggleFiatSellAmount = useCallback(() => {
    onChangeIsInputtingFiatSellAmount(!isInputtingFiatSellAmount)
  }, [isInputtingFiatSellAmount, onChangeIsInputtingFiatSellAmount])

  const handleInputValueChange = useCallback(() => {
    handleInputChange(priceAmountRef.current ?? '0')
  }, [handleInputChange])

  const receiveAmount = useMemo(() => {
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

  const limitOrderExplanation = useMemo(() => {
    if (
      isLoading ||
      bnOrZero(sellAmountCryptoPrecision).isZero() ||
      bnOrZero(limitPriceForSelectedPriceDirection).isZero()
    )
      return null

    const formattedPrice = bnOrZero(limitPriceForSelectedPriceDirection).toFixed(6)
    const formattedSellAmount = bnOrZero(sellAmountCryptoPrecision).toFixed(6)
    const formattedReceiveAmount = bnOrZero(receiveAmount).toFixed(6)

    const assetSymbol =
      priceDirection === PriceDirection.BuyAssetDenomination ? sellAsset.symbol : buyAsset.symbol

    return (
      <CText fontSize='sm' lineHeight='1.6'>
        <Text
          as='span'
          color='text.subtle'
          translation='limitOrder.explanation.priceReaches.prefix'
        />
        <CText as='span' color='white' fontWeight='medium'>
          {' '}
          {assetSymbol}
        </CText>
        <Text
          as='span'
          color='text.subtle'
          translation='limitOrder.explanation.priceReaches.middle'
        />
        <CText as='span' color='white' fontWeight='medium'>
          {' '}
          {formattedPrice}
        </CText>
        <CText as='span' color='white' fontWeight='medium'>
          {' '}
          {priceAsset.symbol}
        </CText>
        <Text as='span' color='text.subtle' translation='limitOrder.explanation.orderWill.prefix' />
        <CText as='span' color='white' fontWeight='medium'>
          {' '}
          {formattedSellAmount}
        </CText>
        <CText as='span' color='white' fontWeight='medium'>
          {' '}
          {sellAsset.symbol}
        </CText>
        <Text as='span' color='text.subtle' translation='limitOrder.explanation.ensuring.prefix' />
        <CText as='span' color='white' fontWeight='medium'>
          {' '}
          {formattedReceiveAmount}
        </CText>
        <CText as='span' color='white' fontWeight='medium'>
          {' '}
          {buyAsset.symbol}
        </CText>
        <Text as='span' color='text.subtle' translation='limitOrder.explanation.ensuring.suffix' />
      </CText>
    )
  }, [
    isLoading,
    sellAmountCryptoPrecision,
    limitPriceForSelectedPriceDirection,
    priceDirection,
    sellAsset.symbol,
    buyAsset.symbol,
    priceAsset.symbol,
    receiveAmount,
  ])

  return (
    <Stack spacing={4} px={6} py={4}>
      <Flex justifyContent='space-between' alignItems='center'>
        <HStack>
          <Text translation='limitOrder.when' />
          <Button
            variant='unstyled'
            onClick={handleTokenTextClick}
            fontWeight='bold'
            fontSize='sm'
            position='relative'
            _after={linkAfter}
            _hover={linkHover}
          >
            1 {displayAsset.symbol}
          </Button>
          <Text translation='limitOrder.isWorth' />
        </HStack>
        <Flex justifyContent='space-between' alignItems='center'>
          <Text translation='limitOrder.market' mr={2} />
          <Button
            variant='unstyled'
            onClick={handleSetMarketLimit}
            isDisabled={isLoading}
            fontWeight='medium'
            fontSize='sm'
            position='relative'
            _after={linkAfter}
            _hover={linkHover}
            opacity={isLoading ? 0.5 : 1}
            cursor={isLoading ? 'not-allowed' : 'pointer'}
          >
            {bnOrZero(marketPriceBuyAsset).toFixed(6)} {priceAsset.symbol}
          </Button>
        </Flex>
      </Flex>
      <HStack width='full' justify='space-between' alignItems='flex-start'>
        <Skeleton isLoaded={!isLoading} minHeight={6}>
          <Flex direction='column' width='full'>
            <NumberFormat
              customInput={AmountInput}
              decimalScale={isInputtingFiatSellAmount ? 2 : priceAsset.precision}
              isNumericString={true}
              decimalSeparator={localeParts.decimal}
              inputMode='decimal'
              allowedDecimalSeparators={allowedDecimalSeparators}
              thousandSeparator={localeParts.group}
              suffix={isInputtingFiatSellAmount ? localeParts.postfix : ''}
              prefix={isInputtingFiatSellAmount ? localeParts.prefix : ''}
              value={
                isInputtingFiatSellAmount ? bnOrZero(fiatValue).toFixed(2) : priceCryptoFormatted
              }
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
            mt={4}
            p={4}
            borderWidth='1px'
            borderStyle='dashed'
            borderRadius='md'
            borderColor='whiteAlpha.300'
          >
            <Flex alignItems='flex-start'>
              <Box as='span' mr={2} mt={1}>
                <InfoIcon boxSize={5} color='gray.500' />
              </Box>
              {limitOrderExplanation}
            </Flex>
          </Box>
        )}

      {maybePriceWarning}
    </Stack>
  )
}
