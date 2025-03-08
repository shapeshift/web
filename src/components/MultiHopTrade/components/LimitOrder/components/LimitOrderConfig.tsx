import {
  Alert,
  AlertIcon,
  AlertTitle,
  Button,
  Flex,
  HStack,
  Skeleton,
  Stack,
} from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { bnOrZero } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useRef } from 'react'
import type { NumberFormatValues } from 'react-number-format'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'

import { AmountInput } from '../../TradeAmountInput'

import { StyledAssetMenuButton } from '@/components/AssetSelection/components/AssetMenuButton'
import { SwapIcon } from '@/components/Icons/SwapIcon'
import { Text } from '@/components/Text'
import { useActions } from '@/hooks/useActions'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { bn } from '@/lib/bignumber/bignumber'
import { LimitPriceMode, PriceDirection } from '@/state/slices/limitOrderInputSlice/constants'
import { limitOrderInput } from '@/state/slices/limitOrderInputSlice/limitOrderInputSlice'
import {
  selectLimitPrice,
  selectLimitPriceDirection,
  selectLimitPriceForSelectedPriceDirection,
} from '@/state/slices/limitOrderInputSlice/selectors'
import { allowedDecimalSeparators } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppSelector } from '@/state/store'

const swapIcon = <SwapIcon />
const disabledProps = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }
const swapPriceButtonProps = { pr: 4, _disabled: disabledProps }

type LimitOrderConfigProps = {
  sellAsset: Asset
  buyAsset: Asset
  isLoading: boolean
  marketPriceBuyAsset: string
}

const linkAfter = {
  content: '""',
  display: 'block',
  height: '1px',
  borderBottom: '1px dotted',
  borderColor: 'whiteAlpha.500',
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

  const handlePriceChange = useCallback(() => {
    // onChange will send us the formatted value
    // To get around this we need to get the value from the onChange using a ref
    // Now when the preset price mode buttons are clicked the onChange will not fire
    setLimitPriceMode(LimitPriceMode.CustomValue)
    setLimitPrice({ marketPriceBuyAsset: priceAmountRef.current ?? '0' })
  }, [setLimitPrice, setLimitPriceMode])

  const handleValueChange = useCallback((values: NumberFormatValues) => {
    // This fires anytime value changes including setting it on preset price mode click
    // Store the value in a ref to send when we actually want the onChange to fire
    priceAmountRef.current = values.value
  }, [])

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
      <HStack width='full' justify='space-between'>
        <Skeleton height={6} isLoaded={!isLoading}>
          <NumberFormat
            customInput={AmountInput}
            decimalScale={priceAsset.precision}
            isNumericString={true}
            decimalSeparator={localeParts.decimal}
            inputMode='decimal'
            allowedDecimalSeparators={allowedDecimalSeparators}
            thousandSeparator={localeParts.group}
            value={priceCryptoFormatted}
            onValueChange={handleValueChange}
            onChange={handlePriceChange}
          />
        </Skeleton>
        <StyledAssetMenuButton
          rightIcon={swapIcon}
          assetId={priceAsset.assetId}
          buttonProps={swapPriceButtonProps}
          onAssetClick={handleTogglePriceDirection}
          isDisabled={isLoading}
        />
      </HStack>
      {maybePriceWarning}
    </Stack>
  )
}
