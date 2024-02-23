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
import type { AccountId } from '@shapeshiftoss/caip'
import { thorchainAssetId, thorchainChainId, toAccountId } from '@shapeshiftoss/caip'
import type { Asset, MarketData } from '@shapeshiftoss/types'
import { useQuery } from '@tanstack/react-query'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FaPlus } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useQuoteEstimatedFeesQuery } from 'react-queries/hooks/useQuoteEstimatedFeesQuery'
import { selectInboundAddressData } from 'react-queries/selectors'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetInput } from 'components/DeFi/components/AssetInput'
import { SlippagePopover } from 'components/MultiHopTrade/components/SlippagePopover'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { assertUnreachable } from 'lib/utils'
import { THOR_PRECISION, THORCHAIN_POOL_MODULE_ADDRESS } from 'lib/utils/thorchain/constants'
import {
  estimateRemoveThorchainLiquidityPosition,
  getThorchainLpTransactionType,
} from 'lib/utils/thorchain/lp'
import type { LpConfirmedWithdrawalQuote, UserLpDataPosition } from 'lib/utils/thorchain/lp/types'
import { AsymSide } from 'lib/utils/thorchain/lp/types'
import { usePools } from 'pages/ThorChainLP/queries/hooks/usePools'
import { useUserLpData } from 'pages/ThorChainLP/queries/hooks/useUserLpData'
import { selectAssetById, selectFeeAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

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

export type RemoveLiquidityInputProps = {
  headerComponent: JSX.Element
  opportunityId: string
  poolAccountId: AccountId
  setConfirmedQuote: (quote: LpConfirmedWithdrawalQuote) => void
  confirmedQuote: LpConfirmedWithdrawalQuote | null
}

export const RemoveLiquidityInput: React.FC<RemoveLiquidityInputProps> = ({
  headerComponent,
  opportunityId,
  confirmedQuote,
  setConfirmedQuote,
  poolAccountId,
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
  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const initialRemovalPercentage = 50

  const [poolAsset, setPoolAsset] = useState<Asset | undefined>(foundPoolAsset)
  const [userlpData, setUserlpData] = useState<UserLpDataPosition | undefined>()
  const [runeAccountId, setRuneAccountId] = useState<AccountId | undefined>()
  const [percentageSelection, setPercentageSelection] = useState<number>(initialRemovalPercentage)
  const [sliderValue, setSliderValue] = useState<number>(initialRemovalPercentage)
  const [shareOfPoolDecimalPercent, setShareOfPoolDecimalPercent] = useState<string | undefined>()

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
  const [slippageRune, setSlippageRune] = useState<string | undefined>()
  const [isSlippageLoading, setIsSlippageLoading] = useState(false)

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

  const actualAssetFiatLiquidityAmount = useMemo(() => {
    if (isAsymAssetSide) {
      // In asym asset side pool, use the virtual fiat amount as is
      return virtualAssetFiatLiquidityAmount
    } else if (isAsymRuneSide) {
      // In asym rune side pool, the asset fiat amount should be zero
      return '0'
    }
    // For symmetrical pools, use the virtual fiat amount as is
    return virtualAssetFiatLiquidityAmount
  }, [isAsymAssetSide, isAsymRuneSide, virtualAssetFiatLiquidityAmount])

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

  const poolAssetFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, poolAsset?.assetId ?? ''),
  )

  const poolAssetFeeAssetMarktData = useAppSelector(state =>
    selectMarketDataById(state, poolAssetFeeAsset?.assetId ?? ''),
  )

  const assetMarketData = useAppSelector(state =>
    selectMarketDataById(state, poolAsset?.assetId ?? ''),
  )
  const runeMarketData = useAppSelector(state => selectMarketDataById(state, rune?.assetId ?? ''))

  const { data: inboundAddressesData } = useQuery({
    ...reactQueries.thornode.inboundAddresses(),
    enabled: !!poolAsset,
    select: data => selectInboundAddressData(data, poolAsset?.assetId),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    // Go stale instantly
    staleTime: 0,
    // Never store queries in cache since we always want fresh data
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 60_000,
  })

  useEffect(() => {
    if (!userData) return
    const _userlpData: UserLpDataPosition | undefined = userData.find(
      data => data.opportunityId === opportunityId,
    )
    if (!_userlpData) return
    setUserlpData(_userlpData)
    const runeAddress = _userlpData?.runeAddress
    if (!runeAddress) return
    const runeAccountId = toAccountId({
      chainId: thorchainChainId,
      account: runeAddress,
    })
    setRuneAccountId(runeAccountId)
  }, [foundPoolAsset, opportunityId, poolAsset?.assetId, userData])

  const handleBackClick = useCallback(() => {
    browserHistory.push('/pools')
  }, [browserHistory])

  const handleSubmit = useCallback(() => {
    history.push(RemoveLiquidityRoutePaths.Confirm)
  }, [history])

  const handlePercentageSliderChange = useCallback(
    (percentage: number) => {
      setSliderValue(percentage)
    },
    [setSliderValue],
  )

  const handlePercentageSliderChangeEnd = useCallback(
    (percentage: number) => {
      setSliderValue(percentage)
      setPercentageSelection(percentage)
    },
    [setPercentageSelection, setSliderValue],
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
        .toFixed(),
    )
    setVirtualRuneFiatLiquidityAmount(
      bnOrZero(underlyingRuneValueFiatUserCurrency)
        .times(percentageSelection / 100)
        .toFixed(),
    )
    setVirtualAssetFiatLiquidityAmount(
      bnOrZero(underlyingAssetValueFiatUserCurrency)
        .times(percentageSelection / 100)
        .toFixed(),
    )
    setVirtualAssetCryptoLiquidityAmount(
      bnOrZero(underlyingAssetAmountCryptoPrecision)
        .times(percentageSelection / 100)
        .toFixed(),
    )
  }, [isAsymAssetSide, isAsymRuneSide, percentageSelection, userlpData])

  // We reuse lending utils here since all this does is estimating fees for a given withdrawal amount with a memo
  // It's not going to be 100% accurate for EVM chains as it doesn't calculate the cost of depositWithExpiry, but rather a simple send,
  // however that's fine for now until accurate fees estimation is implemented
  const { data: estimatedRuneFeesData, isLoading: isEstimatedRuneFeesDataLoading } =
    useQuoteEstimatedFeesQuery({
      collateralAssetId: thorchainAssetId,
      collateralAccountId: runeAccountId ?? '', // This will be undefined for asym asset side LPs, and that's ok
      repaymentAccountId: runeAccountId ?? '', // This will be undefined for asym asset side LPs, and that's ok
      repaymentAsset: runeAsset ?? null,
      repaymentAmountCryptoPrecision: actualRuneCryptoLiquidityAmount,
      confirmedQuote,
    })

  const { data: estimatedPoolAssetFeesData, isLoading: isEstimatedPoolAssetFeesDataLoading } =
    useQuoteEstimatedFeesQuery({
      collateralAssetId: poolAsset?.assetId ?? '',
      collateralAccountId: poolAccountId,
      repaymentAccountId: poolAccountId,
      repaymentAsset: poolAsset ?? null,
      confirmedQuote,
      repaymentAmountCryptoPrecision: actualAssetCryptoLiquidityAmount,
    })

  const poolAssetTxFeeCryptoPrecision = useMemo(
    () =>
      fromBaseUnit(
        estimatedPoolAssetFeesData?.txFeeCryptoBaseUnit ?? 0,
        poolAssetFeeAsset?.precision ?? 0,
      ),
    [estimatedPoolAssetFeesData?.txFeeCryptoBaseUnit, poolAssetFeeAsset?.precision],
  )

  const runeTxFeeCryptoPrecision = useMemo(
    () => fromBaseUnit(estimatedRuneFeesData?.txFeeCryptoBaseUnit ?? 0, rune?.precision ?? 0),
    [estimatedRuneFeesData?.txFeeCryptoBaseUnit, rune?.precision],
  )

  const poolAssetGasFeeFiat = useMemo(
    () => bnOrZero(poolAssetTxFeeCryptoPrecision).times(poolAssetFeeAssetMarktData.price),
    [poolAssetFeeAssetMarktData.price, poolAssetTxFeeCryptoPrecision],
  )

  const runeGasFeeFiat = useMemo(
    () => bnOrZero(runeTxFeeCryptoPrecision).times(runeMarketData.price),
    [runeMarketData.price, runeTxFeeCryptoPrecision],
  )

  const totalGasFeeFiat = useMemo(
    () => poolAssetGasFeeFiat.plus(runeGasFeeFiat).toFixed(2),
    [poolAssetGasFeeFiat, runeGasFeeFiat],
  )

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

  const poolAssetInboundAddress = useMemo(() => {
    if (!poolAsset) return
    const transactionType = getThorchainLpTransactionType(poolAsset.chainId)

    switch (transactionType) {
      case 'MsgDeposit':
        return THORCHAIN_POOL_MODULE_ADDRESS

      case 'EvmCustomTx':
        // TODO: this should really be inboundAddressData?.router, but useQuoteEstimatedFeesQuery doesn't yet handle contract calls
        // for the purpose of naively assuming a send, using the inbound address instead of the router is fine
        return inboundAddressesData?.address

      case 'Send':
        return inboundAddressesData?.address

      default:
        assertUnreachable(transactionType as never)
    }
  }, [poolAsset, inboundAddressesData?.address])

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

      setIsSlippageLoading(false)

      setSlippageRune(
        bnOrZero(estimate.slipPercent)
          .div(100)
          .times(virtualRuneFiatLiquidityAmount ?? 0)
          .times(2)
          .toFixed(),
      )

      setShareOfPoolDecimalPercent(estimate.poolShareDecimalPercent)
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

  useEffect(() => {
    if (
      !(
        actualAssetCryptoLiquidityAmount &&
        actualAssetFiatLiquidityAmount &&
        actualRuneCryptoLiquidityAmount &&
        actualRuneFiatLiquidityAmount &&
        shareOfPoolDecimalPercent &&
        slippageRune &&
        opportunityId &&
        poolAssetInboundAddress
      )
    )
      return

    const totalAmountFiat = bnOrZero(actualAssetFiatLiquidityAmount)
      .times(isAsym ? 1 : 2)
      .toFixed()

    setConfirmedQuote({
      assetCryptoWithdrawAmount: actualAssetCryptoLiquidityAmount,
      assetFiatWithdrawAmount: actualAssetFiatLiquidityAmount,
      runeCryptoWithdrawAmount: actualRuneCryptoLiquidityAmount,
      runeFiatWithdrawAmount: actualRuneFiatLiquidityAmount,
      shareOfPoolDecimalPercent,
      slippageRune,
      opportunityId,
      totalAmountFiat,
      quoteInboundAddress: poolAssetInboundAddress,
      runeGasFeeFiat: runeGasFeeFiat.toFixed(2),
      poolAssetGasFeeFiat: poolAssetGasFeeFiat.toFixed(2),
      totalGasFeeFiat,
      feeBps: '0',
    })
  }, [
    actualAssetCryptoLiquidityAmount,
    actualAssetFiatLiquidityAmount,
    actualRuneCryptoLiquidityAmount,
    actualRuneFiatLiquidityAmount,
    isAsym,
    opportunityId,
    poolAssetGasFeeFiat,
    poolAssetInboundAddress,
    runeGasFeeFiat,
    runeMarketData.price,
    setConfirmedQuote,
    shareOfPoolDecimalPercent,
    slippageRune,
    totalGasFeeFiat,
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
          const isAsym = foundPool.isAsymmetric
          console.log('xxx isAsym', isAsym)
          const marketData = isRune ? runeMarketData : assetMarketData
          const handleRemoveLiquidityInputChange = createHandleRemoveLiquidityInputChange(
            marketData,
            isRune,
          )
          const cryptoAmount = bnOrZero(
            isRune ? virtualRuneCryptoLiquidityAmount : virtualAssetCryptoLiquidityAmount,
          )
            .times(isAsym ? 2 : 1)
            .toFixed()
          const fiatAmount = bnOrZero(
            isRune ? virtualRuneFiatLiquidityAmount : virtualAssetFiatLiquidityAmount,
          )
            .times(isAsym ? 2 : 1)
            .toFixed()
          const cryptoBalance = bnOrZero(
            isRune
              ? userlpData?.underlyingRuneAmountCryptoPrecision
              : userlpData?.underlyingAssetAmountCryptoPrecision,
          )
            .times(isAsym ? 2 : 1)
            .toFixed()

          const fiatBalance = bnOrZero(
            isRune
              ? userlpData?.underlyingRuneValueFiatUserCurrency
              : userlpData?.underlyingAssetValueFiatUserCurrency,
          )
            .times(isAsym ? 2 : 1)
            .toFixed()

          return (
            <AssetInput
              key={asset.assetId}
              accountId={poolAccountId}
              cryptoAmount={cryptoAmount}
              onChange={handleRemoveLiquidityInputChange}
              fiatAmount={fiatAmount}
              showFiatAmount
              assetId={asset.assetId}
              assetIcon={asset.icon}
              assetSymbol={asset.symbol}
              balance={cryptoBalance}
              fiatBalance={fiatBalance}
              percentOptions={percentOptions}
              isReadOnly
              formControlProps={formControlProps}
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
    userlpData?.underlyingRuneAmountCryptoPrecision,
    userlpData?.underlyingAssetAmountCryptoPrecision,
    userlpData?.underlyingRuneValueFiatUserCurrency,
    userlpData?.underlyingAssetValueFiatUserCurrency,
    poolAccountId,
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
            <Amount.Percent value={sliderValue / 100} fontSize='2xl' />
            <Slider
              value={sliderValue}
              onChange={handlePercentageSliderChange}
              onChangeEnd={handlePercentageSliderChangeEnd}
            >
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
            <Skeleton
              isLoaded={!isEstimatedPoolAssetFeesDataLoading && !isEstimatedRuneFeesDataLoading}
            >
              <Amount.Fiat value={totalGasFeeFiat} />
            </Skeleton>
          </Row.Value>
        </Row>
        <Row fontSize='sm' fontWeight='medium'>
          <Row.Label>{translate('common.fees')}</Row.Label>
          <Row.Value>
            <Skeleton isLoaded={true}>
              {/* There are no protocol fees when removing liquidity */}
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
