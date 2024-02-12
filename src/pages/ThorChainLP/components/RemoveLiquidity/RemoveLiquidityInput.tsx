import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Button,
  ButtonGroup,
  CardFooter,
  CardHeader,
  Center,
  Divider,
  Flex,
  FormLabel,
  IconButton,
  Skeleton,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  StackDivider,
} from '@chakra-ui/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import type { Asset, MarketData } from '@shapeshiftoss/types'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FaPlus } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { SlippagePopover } from 'components/MultiHopTrade/components/SlippagePopover'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import { THOR_PRECISION } from 'lib/utils/thorchain/constants'
import { estimateRemoveThorchainLiquidityPosition } from 'lib/utils/thorchain/lp'
import type { UserLpDataPosition } from 'lib/utils/thorchain/lp/types'
import { AsymSide } from 'lib/utils/thorchain/lp/types'
import { usePools } from 'pages/ThorChainLP/queries/hooks/usePools'
import { useUserLpData } from 'pages/ThorChainLP/queries/hooks/useUserLpData'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ReadOnlyAsset } from '../ReadOnlyAsset'
import type { RemoveLiquidityProps } from './RemoveLiquidity'
import { RemoveLiquidityRoutePaths } from './types'

const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 0,
  paddingTop: 0,
}
const dividerStyle = {
  borderBottomWidth: 0,
  marginBottom: 8,
  marginTop: 12,
}

export const RemoveLiquidityInput: React.FC<RemoveLiquidityProps> = ({
  headerComponent,
  opportunityId,
}) => {
  const translate = useTranslate()
  const { history: browserHistory } = useBrowserRouter()
  const history = useHistory()
  const divider = useMemo(() => <StackDivider borderColor='border.base' />, [])
  const { data: parsedPools } = usePools()

  const foundPool = useMemo(() => {
    if (!parsedPools) return undefined
    return parsedPools.find(pool => pool.opportunityId === opportunityId)
  }, [opportunityId, parsedPools])

  const { data: userData } = useUserLpData({ assetId: foundPool?.assetId ?? '' })

  const isAsym = useMemo(() => foundPool?.isAsymmetric, [foundPool?.isAsymmetric])
  const isAsymAssetSide = useMemo(
    () => foundPool?.asymSide === AsymSide.Asset,
    [foundPool?.asymSide],
  )
  const isAsymRuneSide = useMemo(() => foundPool?.asymSide === AsymSide.Rune, [foundPool?.asymSide])

  const foundPoolAsset = useAppSelector(state => selectAssetById(state, foundPool?.assetId ?? ''))
  useEffect(() => {
    if (!foundPoolAsset) return
    setPoolAsset(foundPoolAsset)
  }, [foundPoolAsset])

  const rune = useAppSelector(state => selectAssetById(state, thorchainAssetId))

  const [poolAsset, setPoolAsset] = useState<Asset | undefined>(foundPoolAsset)
  const [userlpData, setUserlpData] = useState<UserLpDataPosition | undefined>()
  const [percentageSelection, setPercentageSelection] = useState<number>(50)

  useEffect(() => {
    if (!userData) return
    const _UserlpData: UserLpDataPosition | undefined = userData.find(
      data => data.opportunityId === opportunityId,
    )
    if (!_UserlpData) return
    setUserlpData(_UserlpData)
  }, [foundPoolAsset, opportunityId, poolAsset?.assetId, userData])

  const handleBackClick = useCallback(() => {
    browserHistory.push('/pools')
  }, [browserHistory])

  const handleAccountIdChange = useCallback(() => {
    console.info('account change')
  }, [])

  const handleSubmit = useCallback(() => {
    history.push(RemoveLiquidityRoutePaths.Confirm)
  }, [history])

  const handlePercentageSliderChange = useCallback(
    (percentage: number) => {
      setPercentageSelection(percentage)
    },
    [setPercentageSelection],
  )

  useEffect(() => {
    if (!userlpData) return

    const {
      underlyingAssetAmountCryptoPrecision,
      underlyingAssetValueFiatUserCurrency,
      underlyingRuneAmountCryptoPrecision,
      underlyingRuneValueFiatUserCurrency,
    } = userlpData

    setVirtualRuneCryptoLiquidityAmount(
      bnOrZero(underlyingRuneAmountCryptoPrecision)
        .times(percentageSelection / 100)
        .times(isAsymAssetSide || isAsymRuneSide ? 2 : 1)
        .toFixed(),
    )
    setVirtualRuneFiatLiquidityAmount(
      bnOrZero(underlyingRuneValueFiatUserCurrency)
        .times(percentageSelection / 100)
        .times(isAsymAssetSide || isAsymRuneSide ? 2 : 1)
        .toFixed(),
    )
    setVirtualAssetFiatLiquidityAmount(
      bnOrZero(underlyingAssetValueFiatUserCurrency)
        .times(percentageSelection / 100)
        .times(isAsymAssetSide || isAsymRuneSide ? 2 : 1)
        .toFixed(),
    )
    setVirtualAssetCryptoLiquidityAmount(
      bnOrZero(underlyingAssetAmountCryptoPrecision)
        .times(percentageSelection / 100)
        .times(isAsymAssetSide || isAsymRuneSide ? 2 : 1)
        .toFixed(),
    )
  }, [isAsymAssetSide, isAsymRuneSide, percentageSelection, userlpData])

  const handlePercentageClick = useCallback((percentage: number) => {
    return () => {
      setPercentageSelection(percentage)
    }
  }, [])

  const percentOptions = useMemo(() => [], [])

  const backIcon = useMemo(() => <ArrowBackIcon />, [])

  const pairDivider = useMemo(() => {
    return (
      <Flex alignItems='center' display='flex' style={dividerStyle}>
        <Divider borderColor='border.base' />
        <Center
          boxSize='32px'
          borderWidth={1}
          borderColor='border.base'
          borderRadius='full'
          color='text.subtle'
          flexShrink={0}
          fontSize='xs'
        >
          <FaPlus />
        </Center>
        <Divider borderColor='border.base' />
      </Flex>
    )
  }, [])

  const renderHeader = useMemo(() => {
    if (headerComponent) return headerComponent
    return (
      <CardHeader display='flex' alignItems='center' justifyContent='space-between'>
        <IconButton
          onClick={handleBackClick}
          variant='ghost'
          icon={backIcon}
          aria-label='go back'
        />
        {translate('pools.addLiquidity')}
        <SlippagePopover />
      </CardHeader>
    )
  }, [backIcon, handleBackClick, headerComponent, translate])

  const assetMarketData = useAppSelector(state =>
    selectMarketDataById(state, poolAsset?.assetId ?? ''),
  )
  const runeMarketData = useAppSelector(state => selectMarketDataById(state, rune?.assetId ?? ''))

  // Virtual as in, these are the amounts if removing symetrically. But a user may remove asymetrically, so these are not the *actual* amounts
  // Keeping these as virtual amounts is useful from a UI perspective, as it allows rebalancing to automagically work when switching from sym. type,
  // while using the *actual* amounts whenever we do things like checking for asset balance
  const [virtualAssetCryptoLiquidityAmount, setVirtualAssetCryptoLiquidityAmount] = useState<
    string | undefined
  >()
  const [virtualAssetFiatLiquidityAmount, setVirtualAssetFiatLiquidityAmount] = useState<
    string | undefined
  >()
  const [virtualRuneCryptoLiquidityAmount, setVirtualRuneCryptoLiquidityAmount] = useState<
    string | undefined
  >()
  const [virtualRuneFiatLiquidityAmount, setVirtualRuneFiatLiquidityAmount] = useState<
    string | undefined
  >()

  const actualAssetCryptoLiquidityAmount = useMemo(() => {
    if (isAsymAssetSide) {
      // In asym asset side pool, use the virtual amount as is
      return virtualAssetCryptoLiquidityAmount
    } else if (isAsymRuneSide) {
      // In asym rune side pool, the asset amount should be zero
      return '0'
    }
    // For symmetrical pools, use the virtual amount as is
    return virtualAssetCryptoLiquidityAmount
  }, [isAsymAssetSide, isAsymRuneSide, virtualAssetCryptoLiquidityAmount])

  const actualRuneCryptoLiquidityAmount = useMemo(() => {
    if (isAsymRuneSide) {
      // In asym rune side pool, use the virtual amount as is
      return virtualRuneCryptoLiquidityAmount
    } else if (isAsymAssetSide) {
      // In asym asset side pool, the rune amount should be zero
      return '0'
    }
    // For symmetrical pools, use the virtual amount as is
    return virtualRuneCryptoLiquidityAmount
  }, [isAsymRuneSide, isAsymAssetSide, virtualRuneCryptoLiquidityAmount])

  const actualRuneFiatLiquidityAmount = useMemo(() => {
    if (isAsymRuneSide) {
      // In asym rune side pool, use the virtual fiat amount as is
      return virtualRuneFiatLiquidityAmount
    } else if (isAsymAssetSide) {
      // In asym asset side pool, the rune fiat amount should be zero
      return '0'
    }
    // For symmetrical pools, use the virtual fiat amount as is
    return virtualRuneFiatLiquidityAmount
  }, [isAsymRuneSide, isAsymAssetSide, virtualRuneFiatLiquidityAmount])

  const [slippageRune, setSlippageRune] = useState<string | undefined>()
  const [isSlippageLoading, setIsSlippageLoading] = useState(false)

  const runePerAsset = useMemo(() => {
    if (!assetMarketData || !runeMarketData) return undefined
    return bn(assetMarketData.price).div(bn(runeMarketData.price)).toFixed()
  }, [assetMarketData, runeMarketData])

  const createHandleRemoveLiquidityInputChange = useCallback(
    (marketData: MarketData, isRune: boolean) => {
      return (value: string, isFiat?: boolean) => {
        if (!poolAsset || !marketData) return undefined
        const crypto = (() => {
          if (!isFiat) return value
          const valueCryptoPrecision = bnOrZero(value)
            .div(bn(marketData.price ?? '0'))
            .toFixed()
          return valueCryptoPrecision
        })()
        const fiat = (() => {
          if (isFiat) return value
          const valueFiatUserCurrency = bnOrZero(value)
            .times(bn(marketData.price ?? '0'))
            .toFixed()
          return valueFiatUserCurrency
        })()

        if (isRune && bnOrZero(runePerAsset).isGreaterThan(0)) {
          setVirtualRuneCryptoLiquidityAmount(crypto)
          setVirtualRuneFiatLiquidityAmount(fiat)
          setVirtualAssetFiatLiquidityAmount(fiat)
          setVirtualAssetCryptoLiquidityAmount(
            bnOrZero(crypto).div(bnOrZero(runePerAsset)).toFixed(),
          )
        } else if (!isRune && bnOrZero(runePerAsset).isGreaterThan(0)) {
          setVirtualAssetCryptoLiquidityAmount(crypto)
          setVirtualAssetFiatLiquidityAmount(fiat)
          setVirtualRuneFiatLiquidityAmount(fiat)
          setVirtualRuneCryptoLiquidityAmount(
            bnOrZero(crypto).times(bnOrZero(runePerAsset)).toFixed(),
          )
        }
      }
    },
    [poolAsset, runePerAsset],
  )

  useEffect(() => {
    ;(async () => {
      if (
        !actualRuneCryptoLiquidityAmount ||
        !actualAssetCryptoLiquidityAmount ||
        !poolAsset ||
        !userData ||
        !userlpData
      )
        return

      const runeAmountCryptoThorPrecision = convertPrecision({
        value: actualRuneCryptoLiquidityAmount,
        inputExponent: 0,
        outputExponent: THOR_PRECISION,
      }).toFixed()

      const assetAmountCryptoThorPrecision = convertPrecision({
        value: actualAssetCryptoLiquidityAmount,
        inputExponent: 0,
        outputExponent: THOR_PRECISION,
      }).toFixed()

      setIsSlippageLoading(true)

      const estimate = await estimateRemoveThorchainLiquidityPosition({
        userData: userlpData,
        assetId: poolAsset.assetId,
        runeAmountCryptoThorPrecision,
        assetAmountCryptoThorPrecision,
      })

      console.log('xxx debug estimate', { estimate })

      setIsSlippageLoading(false)

      setSlippageRune(
        bnOrZero(estimate.slipPercent)
          .div(100)
          .times(virtualRuneFiatLiquidityAmount ?? 0)
          .times(2)
          .toFixed(),
      )
    })()
  }, [
    actualAssetCryptoLiquidityAmount,
    actualRuneCryptoLiquidityAmount,
    actualRuneFiatLiquidityAmount,
    poolAsset,
    foundPool?.asymSide,
    foundPool?.isAsymmetric,
    isAsym,
    isAsymAssetSide,
    isAsymRuneSide,
    virtualRuneFiatLiquidityAmount,
    userData,
    userlpData,
  ])

  const tradeAssetInputs = useMemo(() => {
    if (!(poolAsset && rune && foundPool)) return null

    const assets: Asset[] = (() => {
      if (foundPool.asymSide === null) return [poolAsset, rune]
      if (foundPool.asymSide === AsymSide.Rune) return [rune]
      if (foundPool.asymSide === AsymSide.Asset) return [poolAsset]

      throw new Error('Invalid asym side')
    })()

    return (
      <Stack divider={pairDivider} spacing={0}>
        {assets.map(asset => {
          const isRune = asset.assetId === rune.assetId
          const marketData = isRune ? runeMarketData : assetMarketData
          const handleRemoveLiquidityInputChange = createHandleRemoveLiquidityInputChange(
            marketData,
            isRune,
          )
          const cryptoAmount = isRune
            ? virtualRuneCryptoLiquidityAmount
            : virtualAssetCryptoLiquidityAmount
          const fiatAmount = isRune
            ? virtualRuneFiatLiquidityAmount
            : virtualAssetFiatLiquidityAmount

          // const accountId = accountIdsByChainId[asset.chainId]
          return (
            <TradeAssetInput
              key={asset.assetId}
              assetId={asset?.assetId}
              assetIcon={asset?.icon ?? ''}
              assetSymbol={asset?.symbol ?? ''}
              onAccountIdChange={handleAccountIdChange}
              percentOptions={percentOptions}
              rightComponent={ReadOnlyAsset}
              formControlProps={formControlProps}
              onChange={handleRemoveLiquidityInputChange}
              cryptoAmount={cryptoAmount}
              fiatAmount={fiatAmount}
            />
          )
        })}
      </Stack>
    )
  }, [
    poolAsset,
    rune,
    foundPool,
    pairDivider,
    runeMarketData,
    assetMarketData,
    createHandleRemoveLiquidityInputChange,
    virtualRuneCryptoLiquidityAmount,
    virtualAssetCryptoLiquidityAmount,
    virtualRuneFiatLiquidityAmount,
    virtualAssetFiatLiquidityAmount,
    handleAccountIdChange,
    percentOptions,
  ])

  if (!foundPool || !poolAsset || !rune) return null

  return (
    <SlideTransition>
      {renderHeader}
      <Stack divider={divider} spacing={4} pb={4}>
        <Stack>
          <FormLabel mb={0} px={6} fontSize='sm'>
            {translate('pools.removeAmounts')}
          </FormLabel>
          <Stack px={6} py={4} spacing={4}>
            <Amount.Percent value={percentageSelection / 100} fontSize='2xl' />
            <Slider value={percentageSelection} onChange={handlePercentageSliderChange}>
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb />
            </Slider>
            <ButtonGroup size='sm' justifyContent='space-between'>
              <Button onClick={handlePercentageClick(25)} flex={1}>
                25%
              </Button>
              <Button onClick={handlePercentageClick(50)} flex={1}>
                50%
              </Button>
              <Button onClick={handlePercentageClick(75)} flex={1}>
                75%
              </Button>
              <Button onClick={handlePercentageClick(100)} flex={1}>
                Max
              </Button>
            </ButtonGroup>
          </Stack>
          <Divider borderColor='border.base' />
          <Stack divider={pairDivider} spacing={0}>
            {tradeAssetInputs}
          </Stack>
        </Stack>
      </Stack>
      <CardFooter
        borderTopWidth={1}
        borderColor='border.subtle'
        flexDir='column'
        gap={4}
        px={6}
        py={4}
        bg='background.surface.raised.accent'
      >
        <Row fontSize='sm' fontWeight='medium'>
          <Row.Label>{translate('common.slippage')}</Row.Label>
          <Row.Value>
            <Skeleton isLoaded={!isSlippageLoading}>
              <Amount.Crypto value={slippageRune ?? ''} symbol={rune.symbol} />
            </Skeleton>
          </Row.Value>
        </Row>
        <Row fontSize='sm' fontWeight='medium'>
          <Row.Label>{translate('common.gasFee')}</Row.Label>
          <Row.Value>
            <Skeleton isLoaded={true}>
              <Amount.Fiat value={'0'} />
            </Skeleton>
          </Row.Value>
        </Row>
        <Row fontSize='sm' fontWeight='medium'>
          <Row.Label>{translate('common.fees')}</Row.Label>
          <Row.Value>
            <Skeleton isLoaded={true}>
              <Amount.Fiat value={'0'} />
            </Skeleton>
          </Row.Value>
        </Row>
      </CardFooter>
      <CardFooter
        borderTopWidth={1}
        borderColor='border.subtle'
        flexDir='column'
        gap={4}
        px={6}
        bg='background.surface.raised.accent'
        borderBottomRadius='xl'
      >
        <Button mx={-2} size='lg' colorScheme='blue' onClick={handleSubmit}>
          {translate('pools.removeLiquidity')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
