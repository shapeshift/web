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
import { bnOrZero } from '@shapeshiftoss/utils'
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
  LimitPriceMode,
  PriceDirection,
} from 'state/slices/limitOrderInputSlice/constants'
import { limitOrderInput } from 'state/slices/limitOrderInputSlice/limitOrderInputSlice'
import {
  selectExpiry,
  selectLimitPriceDirection,
  selectLimitPriceForSelectedPriceDirection,
  selectLimitPriceMode,
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
  const expiry = useAppSelector(selectExpiry)
  const limitPriceMode = useAppSelector(selectLimitPriceMode)

  const { setLimitPriceDirection, setExpiry, setLimitPrice, setLimitPriceMode } = useActions(
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

  const handleSetOnePercentLimit = useCallback(() => {
    handleSetPresetLimit(LimitPriceMode.OnePercent)
  }, [handleSetPresetLimit])

  const handleSetTwoPercentLimit = useCallback(() => {
    handleSetPresetLimit(LimitPriceMode.TwoPercent)
  }, [handleSetPresetLimit])

  const handleSetFivePercentLimit = useCallback(() => {
    handleSetPresetLimit(LimitPriceMode.FivePercent)
  }, [handleSetPresetLimit])

  const handleSetTenPercentLimit = useCallback(() => {
    handleSetPresetLimit(LimitPriceMode.TenPercent)
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

    // TODO: Remove me?
    // setLimitPrice({
    //   [priceDirection]: values.value,
    //   [oppositePriceDirection]: bnOrZero(values.value).isZero()
    //     ? '0'
    //     : bn(1).div(values.value).toFixed(),
    // } as Record<PriceDirection, string>)
  }, [])

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
          isActive={limitPriceMode === LimitPriceMode.Market}
          onClick={handleSetMarketLimit}
          isDisabled={isLoading}
        >
          Market
        </Button>
        <Button
          variant='ghost'
          size='sm'
          isActive={limitPriceMode === LimitPriceMode.OnePercent}
          onClick={handleSetOnePercentLimit}
          isDisabled={isLoading}
        >
          1% {arrow}
        </Button>
        <Button
          variant='ghost'
          size='sm'
          isActive={limitPriceMode === LimitPriceMode.TwoPercent}
          onClick={handleSetTwoPercentLimit}
          isDisabled={isLoading}
        >
          2% {arrow}
        </Button>
        <Button
          variant='ghost'
          size='sm'
          isActive={limitPriceMode === LimitPriceMode.FivePercent}
          onClick={handleSetFivePercentLimit}
          isDisabled={isLoading}
        >
          5% {arrow}
        </Button>
        <Button
          variant='ghost'
          size='sm'
          isActive={limitPriceMode === LimitPriceMode.TenPercent}
          onClick={handleSetTenPercentLimit}
          isDisabled={isLoading}
        >
          10% {arrow}
        </Button>
      </Flex>
    </Stack>
  )
}
