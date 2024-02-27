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
import { SwapperName } from '@shapeshiftoss/swapper'
import type { Asset, MarketData } from '@shapeshiftoss/types'
import { useQuery } from '@tanstack/react-query'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FaPlus } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useIsTradingActive } from 'react-queries/hooks/useIsTradingActive'
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
import { useUserLpData } from 'pages/ThorChainLP/queries/hooks/useUserLpData'
import { fromOpportunityId } from 'pages/ThorChainLP/utils'
import { selectAssetById, selectFeeAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { RemoveLiquidityRoutePaths } from './types'

const INITIAL_REMOVAL_PERCENTAGE = 50

const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 0,
  paddingTop: 4,
  paddingLeft: 4,
  paddingRight: 4,
}
const dividerStyle = {
  borderBottomWidth: 0,
  marginBottom: 8,
  marginTop: 12,
}

export type RemoveLiquidityInputProps = {
  headerComponent: JSX.Element
  opportunityId: string
  accountId: AccountId
  setConfirmedQuote: (quote: LpConfirmedWithdrawalQuote) => void
  confirmedQuote: LpConfirmedWithdrawalQuote | null
}

export const RemoveLiquidityInput: React.FC<RemoveLiquidityInputProps> = ({
  headerComponent,
  opportunityId,
  confirmedQuote,
  setConfirmedQuote,
  accountId,
}) => {
  const history = useHistory()
  const translate = useTranslate()
  const { history: browserHistory } = useBrowserRouter()

  const [slippageRune, setSlippageRune] = useState<string | undefined>()
  const [isSlippageLoading, setIsSlippageLoading] = useState(false)
  const [position, setPosition] = useState<UserLpDataPosition | undefined>()
  const [runeAccountId, setRuneAccountId] = useState<AccountId | undefined>()
  const [percentageSelection, setPercentageSelection] = useState<number>(INITIAL_REMOVAL_PERCENTAGE)
  const [sliderValue, setSliderValue] = useState<number>(INITIAL_REMOVAL_PERCENTAGE)
  const [shareOfPoolDecimalPercent, setShareOfPoolDecimalPercent] = useState<string | undefined>()

  const { assetId, type: opportunityType } = useMemo(
    () => fromOpportunityId(opportunityId),
    [opportunityId],
  )

  // Virtual as in, these are the amounts if removing symetrically. But a user may remove asymetrically, so these are not the *actual* amounts
  // Keeping these as virtual amounts is useful from a UI perspective, as it allows rebalancing to automagically work when switching from sym. type,
  // while using the *actual* amounts whenever we do things like checking for asset balance
  const [virtualAssetCryptoLiquidityAmount, setVirtualAssetCryptoLiquidityAmount] = useState<
    string | undefined
  >()
  const [
    virtualAssetLiquidityAmountFiatUserCurrency,
    setVirtualAssetLiquidityAmountFiatUserCurrency,
  ] = useState<string | undefined>()
  const [virtualRuneCryptoLiquidityAmount, setVirtualRuneCryptoLiquidityAmount] = useState<
    string | undefined
  >()
  const [
    virtualRuneLiquidityAmountFiatUserCurrency,
    setVirtualRuneLiquidityAmountFiatUserCurrency,
  ] = useState<string | undefined>()

  const actualAssetCryptoLiquidityAmount = useMemo(() => {
    switch (opportunityType) {
      // Symmetrical: assetAmount = virtual amount (no deposit rebalance, so use current asset value as is)
      case 'sym':
        return virtualAssetCryptoLiquidityAmount
      // Asym Asset: assetAmount = virtual amount times 2 (deposit 50:50 rebalance asset->rune, so current rune value will be swapped into asset before withdrawal)
      case AsymSide.Asset:
        return bnOrZero(virtualAssetCryptoLiquidityAmount).times(2).toFixed()
      // Asym Rune: assetAmount = '0' (deposit 50:50 rebalance rune -> asset, so current asset value will be swapped into rune before withdrawal)
      case AsymSide.Rune:
        return '0'
      default:
        assertUnreachable(opportunityType)
    }
  }, [opportunityType, virtualAssetCryptoLiquidityAmount])

  const actualRuneCryptoLiquidityAmount = useMemo(() => {
    switch (opportunityType) {
      // Symmetrical: runeAmount = virtual amount (no deposit rebalance, so use current rune value as is)
      case 'sym':
        return virtualRuneCryptoLiquidityAmount
      // Asym Rune: runeAmount = virtual amount times 2 (deposit 50:50 rebalance rune->asset, so current asset value will be swapped into rune before withdrawal)
      case AsymSide.Rune:
        return bnOrZero(virtualRuneCryptoLiquidityAmount).times(2).toFixed()
      // Asym Asset: runeAmount = '0' (deposit 50:50 rebalance asset->rune, so current rune value will be swapped into asset before withdrawal)
      case AsymSide.Asset:
        return '0'
      default:
        assertUnreachable(opportunityType)
    }
  }, [opportunityType, virtualRuneCryptoLiquidityAmount])

  const actualAssetLiquidityAmountFiatUserCurrency = useMemo(() => {
    switch (opportunityType) {
      // Symmetrical: assetAmount = virtual amount (no deposit rebalance, so use current asset value as is)
      case 'sym':
        return virtualAssetLiquidityAmountFiatUserCurrency
      // Asym Asset: assetAmount = virtual amount times 2 (deposit 50:50 rebalance asset->rune, so current rune value will be swapped into asset before withdrawal)
      case AsymSide.Asset:
        return bnOrZero(virtualAssetLiquidityAmountFiatUserCurrency).times(2).toFixed()
      // Asym Rune: assetAmount = '0' (deposit 50:50 rebalance rune -> asset, so current asset value will be swapped into rune before withdrawal)
      case AsymSide.Rune:
        return '0'
      default:
        assertUnreachable(opportunityType)
    }
  }, [opportunityType, virtualAssetLiquidityAmountFiatUserCurrency])

  const actualRuneLiquidityAmountFiatUserCurrency = useMemo(() => {
    switch (opportunityType) {
      // Symmetrical: runeAmount = virtual amount (no deposit rebalance, so use current rune value as is)
      case 'sym':
        return virtualRuneLiquidityAmountFiatUserCurrency
      // Asym Rune: runeAmount = virtual amount times 2 (deposit 50:50 rebalance rune->asset, so current asset value will be swapped into rune before withdrawal)
      case AsymSide.Rune:
        return bnOrZero(virtualRuneLiquidityAmountFiatUserCurrency).times(2).toFixed()
      // Asym Asset: runeAmount = '0' (deposit 50:50 rebalance asset->rune, so current rune value will be swapped into asset before withdrawal)
      case AsymSide.Asset:
        return '0'
      default:
        assertUnreachable(opportunityType)
    }
  }, [opportunityType, virtualRuneLiquidityAmountFiatUserCurrency])

  const validInputAmount = useMemo(() => {
    switch (opportunityType) {
      case 'sym':
        return (
          bnOrZero(virtualAssetCryptoLiquidityAmount).gt(0) &&
          bnOrZero(virtualRuneCryptoLiquidityAmount).gt(0)
        )
      case AsymSide.Rune:
        return bnOrZero(virtualRuneCryptoLiquidityAmount).gt(0)
      case AsymSide.Asset:
        return bnOrZero(virtualAssetCryptoLiquidityAmount).gt(0)
      default:
        assertUnreachable(opportunityType)
    }
  }, [opportunityType, virtualAssetCryptoLiquidityAmount, virtualRuneCryptoLiquidityAmount])

  const { data: userLpData } = useUserLpData({ assetId })

  const poolAsset = useAppSelector(state => selectAssetById(state, assetId))
  const poolAssetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const poolAssetFeeAsset = useAppSelector(state => selectFeeAssetById(state, assetId))
  const poolAssetFeeAssetMarktData = useAppSelector(state =>
    selectMarketDataById(state, poolAssetFeeAsset?.assetId ?? ''),
  )

  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const runeMarketData = useAppSelector(state => selectMarketDataById(state, thorchainAssetId))

  const { data: inboundAddressesData } = useQuery({
    ...reactQueries.thornode.inboundAddresses(),
    select: data => selectInboundAddressData(data, assetId),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    // Go stale instantly
    staleTime: 0,
    // Never store queries in cache since we always want fresh data
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 60_000,
  })

  const { isTradingActive, isLoading: isTradingActiveLoading } = useIsTradingActive({
    assetId: poolAsset?.assetId,
    enabled: !!poolAsset,
    swapperName: SwapperName.Thorchain,
  })

  useEffect(() => {
    if (!userLpData) return

    const _position = userLpData.find(data => data.opportunityId === opportunityId)
    if (!_position) return

    setPosition(_position)

    const runeAddress = _position?.runeAddress
    if (!runeAddress) return

    const _runeAccountId = toAccountId({
      chainId: thorchainChainId,
      account: runeAddress,
    })

    setRuneAccountId(_runeAccountId)
  }, [opportunityId, userLpData])

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
    if (!position) return

    const {
      underlyingAssetAmountCryptoPrecision,
      underlyingAssetValueFiatUserCurrency,
      underlyingRuneAmountCryptoPrecision,
      underlyingRuneValueFiatUserCurrency,
    } = position

    setVirtualRuneCryptoLiquidityAmount(
      bnOrZero(underlyingRuneAmountCryptoPrecision)
        .times(percentageSelection / 100)
        .toFixed(),
    )
    setVirtualRuneLiquidityAmountFiatUserCurrency(
      bnOrZero(underlyingRuneValueFiatUserCurrency)
        .times(percentageSelection / 100)
        .toFixed(),
    )
    setVirtualAssetLiquidityAmountFiatUserCurrency(
      bnOrZero(underlyingAssetValueFiatUserCurrency)
        .times(percentageSelection / 100)
        .toFixed(),
    )
    setVirtualAssetCryptoLiquidityAmount(
      bnOrZero(underlyingAssetAmountCryptoPrecision)
        .times(percentageSelection / 100)
        .toFixed(),
    )
  }, [percentageSelection, position])

  // We reuse lending utils here since all this does is estimating fees for a given withdrawal amount with a memo
  // It's not going to be 100% accurate for EVM chains as it doesn't calculate the cost of depositWithExpiry, but rather a simple send,
  // however that's fine for now until accurate fees estimation is implemented
  const {
    data: estimatedRuneFeesData,
    isLoading: isEstimatedRuneFeesDataLoading,
    isError: isEstimatedRuneFeesDataError,
  } = useQuoteEstimatedFeesQuery({
    collateralAssetId: thorchainAssetId,
    collateralAccountId: runeAccountId ?? '', // This will be undefined for asym asset side LPs, and that's ok
    repaymentAccountId: runeAccountId ?? '', // This will be undefined for asym asset side LPs, and that's ok
    repaymentAsset: runeAsset ?? null,
    repaymentAmountCryptoPrecision: actualRuneCryptoLiquidityAmount,
    confirmedQuote,
  })

  const {
    data: estimatedPoolAssetFeesData,
    isLoading: isEstimatedPoolAssetFeesDataLoading,
    isError: isEstimatedPoolAssetFeesDataError,
  } = useQuoteEstimatedFeesQuery({
    collateralAssetId: poolAsset?.assetId ?? '',
    collateralAccountId: accountId,
    repaymentAccountId: accountId,
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
    () => fromBaseUnit(estimatedRuneFeesData?.txFeeCryptoBaseUnit ?? 0, runeAsset?.precision ?? 0),
    [estimatedRuneFeesData?.txFeeCryptoBaseUnit, runeAsset?.precision],
  )

  const poolAssetGasFeeFiatUserCurrency = useMemo(
    () => bnOrZero(poolAssetTxFeeCryptoPrecision).times(poolAssetFeeAssetMarktData.price),
    [poolAssetFeeAssetMarktData.price, poolAssetTxFeeCryptoPrecision],
  )

  const runeGasFeeFiatUserCurrency = useMemo(
    () => bnOrZero(runeTxFeeCryptoPrecision).times(runeMarketData.price),
    [runeMarketData.price, runeTxFeeCryptoPrecision],
  )

  const totalGasFeeFiat = useMemo(
    () => poolAssetGasFeeFiatUserCurrency.plus(runeGasFeeFiatUserCurrency).toFixed(2),
    [poolAssetGasFeeFiatUserCurrency, runeGasFeeFiatUserCurrency],
  )

  const handlePercentageClick = useCallback(
    (percentage: number) => {
      return () => {
        handlePercentageSliderChange(percentage)
        setPercentageSelection(percentage)
      }
    },
    [handlePercentageSliderChange],
  )

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
    if (!poolAssetMarketData || !runeMarketData) return undefined
    return bn(poolAssetMarketData.price).div(bn(runeMarketData.price)).toFixed()
  }, [poolAssetMarketData, runeMarketData])

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
          setVirtualRuneLiquidityAmountFiatUserCurrency(fiat)
          setVirtualAssetLiquidityAmountFiatUserCurrency(fiat)
          setVirtualAssetCryptoLiquidityAmount(
            bnOrZero(crypto).div(bnOrZero(runePerAsset)).toFixed(),
          )
        } else if (!isRune && bnOrZero(runePerAsset).isGreaterThan(0)) {
          setVirtualAssetCryptoLiquidityAmount(crypto)
          setVirtualAssetLiquidityAmountFiatUserCurrency(fiat)
          setVirtualRuneLiquidityAmountFiatUserCurrency(fiat)
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
        !userLpData ||
        !position
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
        userData: position,
        assetId: poolAsset.assetId,
        runeAmountCryptoThorPrecision,
        assetAmountCryptoThorPrecision,
      })

      setIsSlippageLoading(false)

      /*
        Slippage is denominated in RUNE. Since the virtual RUNE amount is always half of the total pool amount
        (for both sym and asym pools), and we want to display the total slippage across the entire position,
        we multiply the slippage by 2 to get the total slippage for the pool.
      */
      setSlippageRune(
        bnOrZero(estimate.slipPercent)
          .div(100)
          .times(virtualRuneLiquidityAmountFiatUserCurrency ?? 0)
          .times(2)
          .toFixed(),
      )

      setShareOfPoolDecimalPercent(estimate.poolShareDecimalPercent)
    })()
  }, [
    actualAssetCryptoLiquidityAmount,
    actualRuneCryptoLiquidityAmount,
    actualRuneLiquidityAmountFiatUserCurrency,
    poolAsset,
    virtualRuneLiquidityAmountFiatUserCurrency,
    userLpData,
    position,
  ])

  useEffect(() => {
    if (
      !(
        actualAssetCryptoLiquidityAmount &&
        actualAssetLiquidityAmountFiatUserCurrency &&
        actualRuneCryptoLiquidityAmount &&
        actualRuneLiquidityAmountFiatUserCurrency &&
        shareOfPoolDecimalPercent &&
        slippageRune &&
        opportunityId &&
        poolAssetInboundAddress &&
        poolAsset
      )
    )
      return

    const totalAmountFiatUserCurrency = bnOrZero(actualAssetLiquidityAmountFiatUserCurrency)
      .times(opportunityType === 'sym' ? 2 : 1)
      .toFixed()

    const poolChainId = poolAsset.chainId

    setConfirmedQuote({
      assetCryptoWithdrawAmount: actualAssetCryptoLiquidityAmount,
      assetWithdrawAmountFiatUserCurrency: actualAssetLiquidityAmountFiatUserCurrency,
      runeCryptoWithdrawAmount: actualRuneCryptoLiquidityAmount,
      runeFWithdrawAmountFiatUserCurrency: actualRuneLiquidityAmountFiatUserCurrency,
      shareOfPoolDecimalPercent,
      slippageRune,
      opportunityId,
      totalAmountFiatUserCurrency,
      quoteInboundAddress: poolAssetInboundAddress,
      runeGasFeeFiatUserCurrency: runeGasFeeFiatUserCurrency.toFixed(2),
      poolAssetGasFeeFiatUserCurrency: poolAssetGasFeeFiatUserCurrency.toFixed(2),
      totalFeeFiatUserCurrency: totalGasFeeFiat,
      feeBps: '0',
      withdrawalBps: (percentageSelection * 100).toString(),
      currentAccountIdByChainId: {
        [poolChainId]: accountId,
        [thorchainChainId]: runeAccountId ?? '',
      },
    })
  }, [
    actualAssetCryptoLiquidityAmount,
    actualAssetLiquidityAmountFiatUserCurrency,
    actualRuneCryptoLiquidityAmount,
    actualRuneLiquidityAmountFiatUserCurrency,
    opportunityType,
    opportunityId,
    accountId,
    percentageSelection,
    poolAsset,
    poolAssetInboundAddress,
    runeAccountId,
    runeGasFeeFiatUserCurrency,
    runeMarketData.price,
    setConfirmedQuote,
    shareOfPoolDecimalPercent,
    slippageRune,
    totalGasFeeFiat,
    poolAssetGasFeeFiatUserCurrency,
  ])

  const tradeAssetInputs = useMemo(() => {
    if (!(poolAsset && runeAsset && opportunityType)) return null

    const assets: Asset[] = (() => {
      switch (opportunityType) {
        case AsymSide.Rune:
          return [runeAsset]
        case AsymSide.Asset:
          return [poolAsset]
        case 'sym':
          return [poolAsset, runeAsset]
        default:
          assertUnreachable(opportunityType)
      }
    })()

    return (
      <Stack divider={pairDivider} spacing={0}>
        {assets.map(asset => {
          const isRune = asset.assetId === runeAsset.assetId
          const marketData = isRune ? runeMarketData : poolAssetMarketData
          const handleRemoveLiquidityInputChange = createHandleRemoveLiquidityInputChange(
            marketData,
            isRune,
          )
          const cryptoAmount = bnOrZero(
            isRune ? virtualRuneCryptoLiquidityAmount : virtualAssetCryptoLiquidityAmount,
          )
            .times(opportunityType === 'sym' ? 1 : 2)
            .toFixed()
          const fiatAmount = bnOrZero(
            isRune
              ? virtualRuneLiquidityAmountFiatUserCurrency
              : virtualAssetLiquidityAmountFiatUserCurrency,
          )
            .times(opportunityType === 'sym' ? 1 : 2)
            .toFixed()
          const cryptoBalance = bnOrZero(
            isRune
              ? position?.underlyingRuneAmountCryptoPrecision
              : position?.underlyingAssetAmountCryptoPrecision,
          )
            .times(opportunityType === 'sym' ? 1 : 2)
            .toFixed()

          const fiatBalance = bnOrZero(
            isRune
              ? position?.underlyingRuneValueFiatUserCurrency
              : position?.underlyingAssetValueFiatUserCurrency,
          )
            .times(opportunityType === 'sym' ? 1 : 2)
            .toFixed()

          return (
            <AssetInput
              key={asset.assetId}
              accountId={accountId}
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
    runeAsset,
    pairDivider,
    runeMarketData,
    poolAssetMarketData,
    createHandleRemoveLiquidityInputChange,
    virtualRuneCryptoLiquidityAmount,
    virtualAssetCryptoLiquidityAmount,
    virtualRuneLiquidityAmountFiatUserCurrency,
    virtualAssetLiquidityAmountFiatUserCurrency,
    position?.underlyingRuneAmountCryptoPrecision,
    position?.underlyingAssetAmountCryptoPrecision,
    position?.underlyingRuneValueFiatUserCurrency,
    position?.underlyingAssetValueFiatUserCurrency,
    accountId,
    percentOptions,
    opportunityType,
  ])

  const divider = useMemo(() => <StackDivider borderColor='border.base' />, [])

  if (!poolAsset || !runeAsset) return null

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
              <Amount.Crypto value={slippageRune ?? ''} symbol={runeAsset.symbol} />
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
        <Button
          mx={-2}
          size='lg'
          colorScheme='blue'
          onClick={handleSubmit}
          isDisabled={
            isTradingActive === false ||
            !confirmedQuote ||
            isEstimatedPoolAssetFeesDataError ||
            isEstimatedRuneFeesDataError ||
            !validInputAmount
          }
          isLoading={
            isTradingActiveLoading ||
            isEstimatedPoolAssetFeesDataLoading ||
            isEstimatedRuneFeesDataLoading
          }
        >
          {translate('pools.removeLiquidity')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
