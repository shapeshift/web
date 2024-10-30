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
  Stack,
} from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { bn, bnOrZero } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { NumberFormatValues } from 'react-number-format'
import NumberFormat from 'react-number-format'
import { StyledAssetMenuButton } from 'components/AssetSelection/components/AssetMenuButton'
import { SwapIcon } from 'components/Icons/SwapIcon'
import { Text } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { assertUnreachable } from 'lib/utils'
import { allowedDecimalSeparators } from 'state/slices/preferencesSlice/preferencesSlice'

import { AmountInput } from '../../TradeAmountInput'

enum PriceDirection {
  Default = 'default',
  Reversed = 'reversed',
}

enum PresetLimit {
  Market = 'market',
  OnePercent = 'onePercent',
  TwoPercent = 'twoPercent',
  FivePercent = 'fivePercent',
  TenPercent = 'tenPercent',
}

enum ExpiryOption {
  OneHour = '1 hour',
  OneDay = '1 day',
  ThreeDays = '3 days',
  SevenDays = '7 days',
  TwentyEightDays = '28 days',
  // TODO: implement custom expiry
  // Custom = 'custom',
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
      return 'limitOrder.expiryOption.oneHour'
    case ExpiryOption.OneDay:
      return 'limitOrder.expiryOption.oneDay'
    case ExpiryOption.ThreeDays:
      return 'limitOrder.expiryOption.threeDays'
    case ExpiryOption.SevenDays:
      return 'limitOrder.expiryOption.sevenDays'
    case ExpiryOption.TwentyEightDays:
      return 'limitOrder.expiryOption.twentyEightDays'
    // TODO: implement custom expiry
    // case ExpiryOption.Custom:
    //   return 'limitOrder.expiryOption.custom'
    default:
      assertUnreachable(expiryOption)
  }
}

const timePeriodRightIcon = <ChevronDownIcon />
const swapIcon = <SwapIcon />
const swapPriceButtonProps = { pr: 4 }

type LimitOrderConfigProps = {
  sellAsset: Asset
  buyAsset: Asset
  marketPriceBuyAssetCryptoPrecision: string
  limitPriceBuyAssetCryptoPrecision: string
  setLimitPriceBuyAssetCryptoPrecision: (priceBuyAssetCryptoPrecision: string) => void
}

export const LimitOrderConfig = ({
  sellAsset,
  buyAsset,
  marketPriceBuyAssetCryptoPrecision,
  limitPriceBuyAssetCryptoPrecision,
  setLimitPriceBuyAssetCryptoPrecision,
}: LimitOrderConfigProps) => {
  const priceAmountRef = useRef<string | null>(null)

  const [priceDirection, setPriceDirection] = useState(PriceDirection.Default)
  const [presetLimit, setPresetLimit] = useState<PresetLimit | undefined>(PresetLimit.Market)
  const [expiryOption, setExpiryOption] = useState(ExpiryOption.SevenDays)

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
    return priceDirection === PriceDirection.Default ? buyAsset : sellAsset
  }, [buyAsset, priceDirection, sellAsset])

  // Lower the decimal places when the integer is greater than 8 significant digits for better UI
  const priceCryptoFormatted = useMemo(() => {
    const cryptoAmountIntegerCount = bnOrZero(
      bnOrZero(limitPriceBuyAssetCryptoPrecision).toFixed(0),
    ).precision(true)

    return cryptoAmountIntegerCount <= 8
      ? limitPriceBuyAssetCryptoPrecision
      : bnOrZero(limitPriceBuyAssetCryptoPrecision).toFixed(3)
  }, [limitPriceBuyAssetCryptoPrecision])

  const arrow = useMemo(() => {
    return priceDirection === PriceDirection.Default ? '↑' : '↓'
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
      const adjustedLimitPrice = bn(marketPriceBuyAssetCryptoPrecision).times(multiplier).toFixed()
      const maybeReversedPrice =
        priceDirection === PriceDirection.Reversed
          ? bn(1).div(adjustedLimitPrice).toFixed()
          : adjustedLimitPrice
      setLimitPriceBuyAssetCryptoPrecision(maybeReversedPrice)
    },
    [marketPriceBuyAssetCryptoPrecision, setLimitPriceBuyAssetCryptoPrecision],
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
      priceDirection === PriceDirection.Default ? PriceDirection.Reversed : PriceDirection.Default
    setPriceDirection(newPriceDirection)

    const isCustomLimit = presetLimit === undefined

    if (isCustomLimit) {
      // For custom limit, just take the reciprocal as we don't know what the original input value was
      setLimitPriceBuyAssetCryptoPrecision(bn(1).div(limitPriceBuyAssetCryptoPrecision).toFixed())
    } else {
      // Otherwise set it to the precise value based on the original market price
      handleSetPresetLimit(presetLimit, newPriceDirection)
    }
  }, [
    handleSetPresetLimit,
    limitPriceBuyAssetCryptoPrecision,
    presetLimit,
    priceDirection,
    setLimitPriceBuyAssetCryptoPrecision,
  ])

  const handlePriceChange = useCallback(() => {
    // onChange will send us the formatted value
    // To get around this we need to get the value from the onChange using a ref
    // Now when the max buttons are clicked the onChange will not fire
    setLimitPriceBuyAssetCryptoPrecision(priceAmountRef.current ?? '0')

    // Unset the preset limit, as this is a custom value
    setPresetLimit(undefined)
  }, [setLimitPriceBuyAssetCryptoPrecision])

  const handleValueChange = useCallback(
    (values: NumberFormatValues) => {
      // This fires anytime value changes including setting it on max click
      // Store the value in a ref to send when we actually want the onChange to fire
      priceAmountRef.current = values.value
      setLimitPriceBuyAssetCryptoPrecision(values.value)
    },
    [setLimitPriceBuyAssetCryptoPrecision],
  )

  const expiryOptionTranslation = useMemo(() => {
    return getExpiryOptionTranslation(expiryOption)
  }, [expiryOption])

  const handleChangeExpiryOption = useCallback((newExpiry: string | string[]) => {
    setExpiryOption(newExpiry as ExpiryOption)
  }, [])

  return (
    <Stack spacing={4} px={6} py={4}>
      <Flex justifyContent='space-between' alignItems='center'>
        <Text translation='limitOrder.whenPriceReaches' />
        <Flex justifyContent='space-between' alignItems='center'>
          <Text translation='limitOrder.expiry' mr={4} />
          <Menu isLazy>
            <MenuButton as={Button} rightIcon={timePeriodRightIcon}>
              <Text translation={expiryOptionTranslation} />
            </MenuButton>
            <MenuList zIndex='modal'>
              <MenuOptionGroup
                type='radio'
                value={expiryOption}
                onChange={handleChangeExpiryOption}
              >
                {expiryOptions}
              </MenuOptionGroup>
            </MenuList>
          </Menu>
        </Flex>
      </Flex>
      <HStack width='full' justify='space-between'>
        {/* <Amount.Crypto value={priceCryptoPrecision} symbol='' size='lg' fontSize='xl' /> */}
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
        <StyledAssetMenuButton
          rightIcon={swapIcon}
          assetId={priceAsset.assetId}
          buttonProps={swapPriceButtonProps}
          onAssetClick={handleTogglePriceDirection}
        />
      </HStack>
      <Flex justifyContent='space-between'>
        <Button
          variant='ghost'
          size='sm'
          isActive={presetLimit === PresetLimit.Market}
          onClick={handleSetMarketLimit}
        >
          Market
        </Button>
        <Button
          variant='ghost'
          size='sm'
          isActive={presetLimit === PresetLimit.OnePercent}
          onClick={handleSetOnePercentLimit}
        >
          1% {arrow}
        </Button>
        <Button
          variant='ghost'
          size='sm'
          isActive={presetLimit === PresetLimit.TwoPercent}
          onClick={handleSetTwoPercentLimit}
        >
          2% {arrow}
        </Button>
        <Button
          variant='ghost'
          size='sm'
          isActive={presetLimit === PresetLimit.FivePercent}
          onClick={handleSetFivePercentLimit}
        >
          5% {arrow}
        </Button>
        <Button
          variant='ghost'
          size='sm'
          isActive={presetLimit === PresetLimit.TenPercent}
          onClick={handleSetTenPercentLimit}
        >
          10% {arrow}
        </Button>
      </Flex>
    </Stack>
  )
}
