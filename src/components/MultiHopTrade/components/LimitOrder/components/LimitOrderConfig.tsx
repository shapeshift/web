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
import { noop } from 'lodash'
import { useCallback, useMemo, useState } from 'react'
import { Amount } from 'components/Amount/Amount'
import { StyledAssetMenuButton } from 'components/AssetSelection/components/AssetMenuButton'
import { SwapIcon } from 'components/Icons/SwapIcon'
import { RawText, Text } from 'components/Text'

const EXPIRY_TIME_PERIODS = ['1 hour', '1 day', '3 days', '7 days', '28 days'] as const

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

enum PriceDirection {
  Sell = 'sell',
  Buy = 'buy',
}

enum PresetLimit {
  Market = 'market',
  OnePercent = 'onePercent',
  TwoPercent = 'twoPercent',
  FivePercent = 'fivePercent',
  TenPercent = 'tenPercent',
}

export const LimitOrderConfig = ({
  sellAsset,
  buyAsset,
  marketPriceBuyAssetCryptoPrecision,
  limitPriceBuyAssetCryptoPrecision,
  setLimitPriceBuyAssetCryptoPrecision,
}: LimitOrderConfigProps) => {
  const [priceDirection, setPriceDirection] = useState(PriceDirection.Sell)
  const [presetLimit, setPresetLimit] = useState(PresetLimit.Market)

  const renderedChains = useMemo(() => {
    return EXPIRY_TIME_PERIODS.map(timePeriod => {
      return (
        <MenuItemOption value={timePeriod} key={timePeriod}>
          <RawText>{timePeriod}</RawText>
        </MenuItemOption>
      )
    })
  }, [])

  const priceAsset = useMemo(() => {
    return priceDirection === PriceDirection.Sell ? sellAsset : buyAsset
  }, [buyAsset, priceDirection, sellAsset])

  const priceCryptoPrecision = useMemo(() => {
    if (bnOrZero(limitPriceBuyAssetCryptoPrecision).isZero()) {
      return '0'
    }

    return priceDirection === PriceDirection.Sell
      ? bn(1).div(limitPriceBuyAssetCryptoPrecision).toFixed()
      : limitPriceBuyAssetCryptoPrecision
  }, [limitPriceBuyAssetCryptoPrecision, priceDirection])

  const handleTogglePriceDirection = useCallback(() => {
    setPriceDirection(
      priceDirection === PriceDirection.Sell ? PriceDirection.Buy : PriceDirection.Sell,
    )
  }, [priceDirection])

  const arrow = useMemo(() => {
    return priceDirection === PriceDirection.Sell ? '↑' : '↓'
  }, [priceDirection])

  const handleSetMarketLimit = useCallback(() => {
    setPresetLimit(PresetLimit.Market)
    setLimitPriceBuyAssetCryptoPrecision(marketPriceBuyAssetCryptoPrecision)
  }, [marketPriceBuyAssetCryptoPrecision, setLimitPriceBuyAssetCryptoPrecision])

  const handleSetOnePercentLimit = useCallback(() => {
    setPresetLimit(PresetLimit.OnePercent)
    const price = bn(marketPriceBuyAssetCryptoPrecision).div('1.01').toFixed()
    setLimitPriceBuyAssetCryptoPrecision(price)
  }, [marketPriceBuyAssetCryptoPrecision, setLimitPriceBuyAssetCryptoPrecision])

  const handleSetTwoPercentLimit = useCallback(() => {
    setPresetLimit(PresetLimit.TwoPercent)
    const price = bn(marketPriceBuyAssetCryptoPrecision).div('1.02').toFixed()
    setLimitPriceBuyAssetCryptoPrecision(price)
  }, [marketPriceBuyAssetCryptoPrecision, setLimitPriceBuyAssetCryptoPrecision])

  const handleSetFivePercentLimit = useCallback(() => {
    setPresetLimit(PresetLimit.FivePercent)
    const price = bn(marketPriceBuyAssetCryptoPrecision).div('1.05').toFixed()
    setLimitPriceBuyAssetCryptoPrecision(price)
  }, [marketPriceBuyAssetCryptoPrecision, setLimitPriceBuyAssetCryptoPrecision])

  const handleSetTenPercentLimit = useCallback(() => {
    setPresetLimit(PresetLimit.TenPercent)
    const price = bn(marketPriceBuyAssetCryptoPrecision).div('1.10').toFixed()
    setLimitPriceBuyAssetCryptoPrecision(price)
  }, [marketPriceBuyAssetCryptoPrecision, setLimitPriceBuyAssetCryptoPrecision])

  return (
    <Stack spacing={4} px={6} py={4}>
      <Flex justifyContent='space-between' alignItems='center'>
        <Text translation='limitOrder.whenPriceReaches' />
        <Flex justifyContent='space-between' alignItems='center'>
          <Text translation='limitOrder.expiry' mr={4} />
          <Menu isLazy>
            <MenuButton as={Button} rightIcon={timePeriodRightIcon}>
              <RawText>1 hour</RawText>
            </MenuButton>
            <MenuList zIndex='modal'>
              <MenuOptionGroup type='radio' value={'1 hour'} onChange={noop}>
                {renderedChains}
              </MenuOptionGroup>
            </MenuList>
          </Menu>
        </Flex>
      </Flex>
      <HStack width='full' justify='space-between'>
        <Amount.Crypto value={priceCryptoPrecision} symbol='' size='lg' fontSize='xl' />
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
