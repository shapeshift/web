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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { NumberFormatValues } from 'react-number-format'
import NumberFormat from 'react-number-format'
import { StyledAssetMenuButton } from 'components/AssetSelection/components/AssetMenuButton'
import { SwapIcon } from 'components/Icons/SwapIcon'
import { Text } from 'components/Text'
import { useActions } from 'hooks/useActions'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { assertUnreachable } from 'lib/utils'
import { ExpiryOption, PriceDirection } from 'state/slices/limitOrderInputSlice/constants'
import { limitOrderInput } from 'state/slices/limitOrderInputSlice/limitOrderInputSlice'
import {
  selectExpiry,
  selectLimitPrice,
  selectLimitPriceDirection,
} from 'state/slices/limitOrderInputSlice/selectors'
import { allowedDecimalSeparators } from 'state/slices/preferencesSlice/preferencesSlice'
import { useAppSelector } from 'state/store'

import { AmountInput } from '../../TradeAmountInput'

enum PresetLimit {
  Market = 'market',
  OnePercent = 'onePercent',
  TwoPercent = 'twoPercent',
  FivePercent = 'fivePercent',
  TenPercent = 'tenPercent',
}

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

  const [presetLimit, setPresetLimit] = useState<PresetLimit | undefined>(PresetLimit.Market)

  const limitPrice = useAppSelector(selectLimitPrice)
  const priceDirection = useAppSelector(selectLimitPriceDirection)
  const expiry = useAppSelector(selectExpiry)

  const { setLimitPriceDirection, setExpiry, setLimitPrice } = useActions(limitOrderInput.actions)

  // Reset the user config when the assets change
  useEffect(
    () => {
      setLimitPriceDirection(PriceDirection.BuyAssetDenomination)
      setPresetLimit(PresetLimit.Market)
      setExpiry(ExpiryOption.SevenDays)
      setLimitPrice(marketPriceBuyAsset)
    },
    // NOTE: we DO NOT want to react to `marketPriceBuyAsset` here, because polling will reset it
    // every time!
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sellAsset, buyAsset, setLimitPrice],
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
    const cryptoAmountIntegerCount = bnOrZero(bnOrZero(limitPrice).toFixed(0)).precision(true)

    return cryptoAmountIntegerCount <= 8 ? limitPrice : bnOrZero(limitPrice).toFixed(3)
  }, [limitPrice])

  const arrow = useMemo(() => {
    return priceDirection === PriceDirection.BuyAssetDenomination ? '↑' : '↓'
  }, [priceDirection])

  const handleSetPresetLimit = useCallback(
    (presetLimit: PresetLimit, priceDirection: PriceDirection) => {
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
      const adjustedLimitPrice = bn(marketPriceBuyAsset).times(multiplier).toFixed()
      const maybeReversedPrice =
        priceDirection === PriceDirection.SellAssetDenomination
          ? bn(1).div(adjustedLimitPrice).toFixed()
          : adjustedLimitPrice
      setLimitPrice(maybeReversedPrice)
    },
    [marketPriceBuyAsset, setLimitPrice],
  )

  const handleSetMarketLimit = useCallback(() => {
    handleSetPresetLimit(PresetLimit.Market, priceDirection)
  }, [handleSetPresetLimit, priceDirection])

  const handleSetOnePercentLimit = useCallback(() => {
    handleSetPresetLimit(PresetLimit.OnePercent, priceDirection)
  }, [handleSetPresetLimit, priceDirection])

  const handleSetTwoPercentLimit = useCallback(() => {
    handleSetPresetLimit(PresetLimit.TwoPercent, priceDirection)
  }, [handleSetPresetLimit, priceDirection])

  const handleSetFivePercentLimit = useCallback(() => {
    handleSetPresetLimit(PresetLimit.FivePercent, priceDirection)
  }, [handleSetPresetLimit, priceDirection])

  const handleSetTenPercentLimit = useCallback(() => {
    handleSetPresetLimit(PresetLimit.TenPercent, priceDirection)
  }, [handleSetPresetLimit, priceDirection])

  const handleTogglePriceDirection = useCallback(() => {
    const newPriceDirection =
      priceDirection === PriceDirection.BuyAssetDenomination
        ? PriceDirection.SellAssetDenomination
        : PriceDirection.BuyAssetDenomination
    setLimitPriceDirection(newPriceDirection)

    const isCustomLimit = presetLimit === undefined

    if (isCustomLimit) {
      // For custom limit, just take the reciprocal as we don't know what the original input value was
      setLimitPrice(bn(1).div(limitPrice).toFixed())
    } else {
      // Otherwise set it to the precise value based on the original market price
      handleSetPresetLimit(presetLimit, newPriceDirection)
    }
  }, [
    handleSetPresetLimit,
    limitPrice,
    presetLimit,
    priceDirection,
    setLimitPrice,
    setLimitPriceDirection,
  ])

  const handlePriceChange = useCallback(() => {
    // onChange will send us the formatted value
    // To get around this we need to get the value from the onChange using a ref
    // Now when the max buttons are clicked the onChange will not fire
    setLimitPrice(priceAmountRef.current ?? '0')

    // Unset the preset limit, as this is a custom value
    setPresetLimit(undefined)
  }, [setLimitPrice])

  const handleValueChange = useCallback(
    (values: NumberFormatValues) => {
      // This fires anytime value changes including setting it on max click
      // Store the value in a ref to send when we actually want the onChange to fire
      priceAmountRef.current = values.value
      setLimitPrice(values.value)
    },
    [setLimitPrice],
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
          isActive={presetLimit === PresetLimit.Market}
          onClick={handleSetMarketLimit}
          isDisabled={isLoading}
        >
          Market
        </Button>
        <Button
          variant='ghost'
          size='sm'
          isActive={presetLimit === PresetLimit.OnePercent}
          onClick={handleSetOnePercentLimit}
          isDisabled={isLoading}
        >
          1% {arrow}
        </Button>
        <Button
          variant='ghost'
          size='sm'
          isActive={presetLimit === PresetLimit.TwoPercent}
          onClick={handleSetTwoPercentLimit}
          isDisabled={isLoading}
        >
          2% {arrow}
        </Button>
        <Button
          variant='ghost'
          size='sm'
          isActive={presetLimit === PresetLimit.FivePercent}
          onClick={handleSetFivePercentLimit}
          isDisabled={isLoading}
        >
          5% {arrow}
        </Button>
        <Button
          variant='ghost'
          size='sm'
          isActive={presetLimit === PresetLimit.TenPercent}
          onClick={handleSetTenPercentLimit}
          isDisabled={isLoading}
        >
          10% {arrow}
        </Button>
      </Flex>
    </Stack>
  )
}
