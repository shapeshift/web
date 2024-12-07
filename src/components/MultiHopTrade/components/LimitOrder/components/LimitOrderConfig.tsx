import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Button,
  Flex,
  HStack,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Skeleton,
  Stack,
} from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { bn, bnOrZero } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useRef } from 'react'
import type { NumberFormatValues } from 'react-number-format'
import NumberFormat from 'react-number-format'
import { StyledAssetMenuButton } from 'components/AssetSelection/components/AssetMenuButton'
import { SwapIcon } from 'components/Icons/SwapIcon'
import { Text } from 'components/Text'
import { useActions } from 'hooks/useActions'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { assertUnreachable } from 'lib/utils'
import {
  ExpiryOption,
  PresetLimit,
  PriceDirection,
} from 'state/slices/limitOrderInputSlice/constants'
import { limitOrderInput } from 'state/slices/limitOrderInputSlice/limitOrderInputSlice'
import {
  selectExpiry,
  selectLimitPriceDirection,
  selectLimitPriceForSelectedPriceDirection,
  selectLimitPriceOppositeDirection,
  selectPresetLimitPrice,
} from 'state/slices/limitOrderInputSlice/selectors'
import { allowedDecimalSeparators } from 'state/slices/preferencesSlice/preferencesSlice'
import { useAppSelector } from 'state/store'

import { AmountInput } from '../../TradeAmountInput'

const EXPIRY_OPTIONS = [
  ExpiryOption.OneHour,
  ExpiryOption.OneDay,
  ExpiryOption.ThreeDays,
  ExpiryOption.SevenDays,
  ExpiryOption.TwentyEightDays,
] as const

const getExpiryOptionTranslation = (expiryOption: ExpiryOption) => {
  switch (expiryOption) {
    case ExpiryOption.OneHour:
      return `limitOrder.expiryOption.${expiryOption}`
    case ExpiryOption.OneDay:
      return `limitOrder.expiryOption.${expiryOption}`
    case ExpiryOption.ThreeDays:
      return `limitOrder.expiryOption.${expiryOption}`
    case ExpiryOption.SevenDays:
      return `limitOrder.expiryOption.${expiryOption}`
    case ExpiryOption.TwentyEightDays:
      return `limitOrder.expiryOption.${expiryOption}`
    // TODO: implement custom expiry
    // case ExpiryOption.Custom:
    //   return `limitOrder.expiryOption.${expiryOption}`
    default:
      assertUnreachable(expiryOption)
  }
}

const timePeriodRightIcon = <ChevronDownIcon />
const swapIcon = <SwapIcon />
const disabledProps = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }
const swapPriceButtonProps = { pr: 4, _disabled: disabledProps }

type LimitOrderConfigProps = {
  sellAsset: Asset
  buyAsset: Asset
  isLoading: boolean
  marketPriceBuyAsset: string
}

export const LimitOrderConfig = ({
  sellAsset,
  buyAsset,
  isLoading,
  marketPriceBuyAsset,
}: LimitOrderConfigProps) => {
  const priceAmountRef = useRef<string | null>(null)

  const limitPriceForSelectedPriceDirection = useAppSelector(
    selectLimitPriceForSelectedPriceDirection,
  )
  const priceDirection = useAppSelector(selectLimitPriceDirection)
  const oppositePriceDirection = useAppSelector(selectLimitPriceOppositeDirection)
  const expiry = useAppSelector(selectExpiry)
  const presetLimitPrice = useAppSelector(selectPresetLimitPrice)

  const { setLimitPriceDirection, setExpiry, setLimitPrice, setPresetLimit } = useActions(
    limitOrderInput.actions,
  )

  const {
    number: { localeParts },
  } = useLocaleFormatter()

  const expiryOptions = useMemo(() => {
    return EXPIRY_OPTIONS.map(expiryOption => {
      return (
        <MenuItemOption value={expiryOption} key={expiryOption}>
          <Text translation={getExpiryOptionTranslation(expiryOption)} />
        </MenuItemOption>
      )
    })
  }, [])

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

  const arrow = useMemo(() => {
    return priceDirection === PriceDirection.BuyAssetDenomination ? '↑' : '↓'
  }, [priceDirection])

  const handleSetPresetLimit = useCallback(
    (presetLimit: PresetLimit) => {
      setPresetLimit(presetLimit)
      const multiplier = (() => {
        switch (presetLimit) {
          case PresetLimit.Market:
            return '1.00'
          case PresetLimit.OnePercent:
            return '1.01'
          case PresetLimit.TwoPercent:
            return '1.02'
          case PresetLimit.FivePercent:
            return '1.05'
          case PresetLimit.TenPercent:
            return '1.10'
          default:
            assertUnreachable(presetLimit)
        }
      })()
      const adjustedLimitPriceBuyAsset = bn(marketPriceBuyAsset).times(multiplier).toFixed()
      setLimitPrice({
        [PriceDirection.BuyAssetDenomination]: adjustedLimitPriceBuyAsset,
        [PriceDirection.SellAssetDenomination]: bn(1).div(adjustedLimitPriceBuyAsset).toFixed(),
      })
    },
    [marketPriceBuyAsset, setLimitPrice, setPresetLimit],
  )

  const handleSetMarketLimit = useCallback(() => {
    handleSetPresetLimit(PresetLimit.Market)
  }, [handleSetPresetLimit])

  const handleSetOnePercentLimit = useCallback(() => {
    handleSetPresetLimit(PresetLimit.OnePercent)
  }, [handleSetPresetLimit])

  const handleSetTwoPercentLimit = useCallback(() => {
    handleSetPresetLimit(PresetLimit.TwoPercent)
  }, [handleSetPresetLimit])

  const handleSetFivePercentLimit = useCallback(() => {
    handleSetPresetLimit(PresetLimit.FivePercent)
  }, [handleSetPresetLimit])

  const handleSetTenPercentLimit = useCallback(() => {
    handleSetPresetLimit(PresetLimit.TenPercent)
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
    // Now when the max buttons are clicked the onChange will not fire
    setLimitPrice({
      [priceDirection]: priceAmountRef.current ?? '0',
      [oppositePriceDirection]: bnOrZero(priceAmountRef.current).isZero()
        ? '0'
        : bn(1)
            .div(priceAmountRef.current ?? NaN) // Never zero or nullish, stfu typescript
            .toFixed(),
    } as Record<PriceDirection, string>)

    // Unset the preset limit, as this is a custom value
    setPresetLimit(undefined)
  }, [oppositePriceDirection, priceDirection, setLimitPrice, setPresetLimit])

  const handleValueChange = useCallback(
    (values: NumberFormatValues) => {
      // This fires anytime value changes including setting it on max click
      // Store the value in a ref to send when we actually want the onChange to fire
      priceAmountRef.current = values.value
      setLimitPrice({
        [priceDirection]: values.value,
        [oppositePriceDirection]: bnOrZero(values.value).isZero()
          ? '0'
          : bn(1).div(values.value).toFixed(),
      } as Record<PriceDirection, string>)
    },
    [oppositePriceDirection, priceDirection, setLimitPrice],
  )

  const expiryOptionTranslation = useMemo(() => {
    return getExpiryOptionTranslation(expiry)
  }, [expiry])

  const handleChangeExpiryOption = useCallback(
    (newExpiry: string | string[]) => {
      setExpiry(newExpiry as ExpiryOption)
    },
    [setExpiry],
  )

  return (
    <Stack spacing={4} px={6} py={4}>
      <Flex justifyContent='space-between' alignItems='center'>
        <Text translation='limitOrder.whenPriceReaches' />
        <Flex justifyContent='space-between' alignItems='center'>
          <Text translation='limitOrder.expiry' mr={4} />
          <Menu isLazy>
            <MenuButton as={Button} rightIcon={timePeriodRightIcon} isDisabled={isLoading}>
              <Text translation={expiryOptionTranslation} />
            </MenuButton>
            <MenuList zIndex='modal'>
              <MenuOptionGroup type='radio' value={expiry} onChange={handleChangeExpiryOption}>
                {expiryOptions}
              </MenuOptionGroup>
            </MenuList>
          </Menu>
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
      <Flex justifyContent='space-between'>
        <Button
          variant='ghost'
          size='sm'
          isActive={presetLimitPrice === PresetLimit.Market}
          onClick={handleSetMarketLimit}
          isDisabled={isLoading}
        >
          Market
        </Button>
        <Button
          variant='ghost'
          size='sm'
          isActive={presetLimitPrice === PresetLimit.OnePercent}
          onClick={handleSetOnePercentLimit}
          isDisabled={isLoading}
        >
          1% {arrow}
        </Button>
        <Button
          variant='ghost'
          size='sm'
          isActive={presetLimitPrice === PresetLimit.TwoPercent}
          onClick={handleSetTwoPercentLimit}
          isDisabled={isLoading}
        >
          2% {arrow}
        </Button>
        <Button
          variant='ghost'
          size='sm'
          isActive={presetLimitPrice === PresetLimit.FivePercent}
          onClick={handleSetFivePercentLimit}
          isDisabled={isLoading}
        >
          5% {arrow}
        </Button>
        <Button
          variant='ghost'
          size='sm'
          isActive={presetLimitPrice === PresetLimit.TenPercent}
          onClick={handleSetTenPercentLimit}
          isDisabled={isLoading}
        >
          10% {arrow}
        </Button>
      </Flex>
    </Stack>
  )
}
