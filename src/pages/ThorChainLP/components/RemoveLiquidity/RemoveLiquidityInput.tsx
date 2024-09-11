import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
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
import { THORCHAIN_OUTBOUND_FEE_RUNE_THOR_UNIT } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/constants'
import type { Asset, MarketData } from '@shapeshiftoss/types'
import { convertPercentageToBasisPoints } from '@shapeshiftoss/utils'
import { useQuery } from '@tanstack/react-query'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { BiSolidBoltCircle } from 'react-icons/bi'
import { FaPlus } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useIsTradingActive } from 'react-queries/hooks/useIsTradingActive'
import { useHistory } from 'react-router'
import { WarningAcknowledgement } from 'components/Acknowledgement/Acknowledgement'
import { Amount } from 'components/Amount/Amount'
import { SlippagePopover } from 'components/MultiHopTrade/components/SlippagePopover'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { assertUnreachable } from 'lib/utils'
import { fromThorBaseUnit } from 'lib/utils/thorchain'
import { THOR_PRECISION } from 'lib/utils/thorchain/constants'
import { useSendThorTx } from 'lib/utils/thorchain/hooks/useSendThorTx'
import { estimateRemoveThorchainLiquidityPosition } from 'lib/utils/thorchain/lp'
import type { LpConfirmedWithdrawalQuote, UserLpDataPosition } from 'lib/utils/thorchain/lp/types'
import { AsymSide } from 'lib/utils/thorchain/lp/types'
import { isLpConfirmedDepositQuote } from 'lib/utils/thorchain/lp/utils'
import { useIsSweepNeededQuery } from 'pages/Lending/hooks/useIsSweepNeededQuery'
import { usePool } from 'pages/ThorChainLP/queries/hooks/usePool'
import { useUserLpData } from 'pages/ThorChainLP/queries/hooks/useUserLpData'
import { getThorchainLpPosition } from 'pages/ThorChainLP/queries/queries'
import type { OpportunityType } from 'pages/ThorChainLP/utils'
import { fromOpportunityId } from 'pages/ThorChainLP/utils'
import {
  selectAccountIdsByAssetId,
  selectAssetById,
  selectFeeAssetById,
  selectFirstAccountIdByChainId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioAccountMetadataByAccountId,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { LpType } from '../LpType'
import { ReadOnlyAsset } from '../ReadOnlyAsset'
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
  poolAssetId: string
}

export const RemoveLiquidityInput: React.FC<RemoveLiquidityInputProps> = ({
  headerComponent,
  opportunityId,
  confirmedQuote,
  setConfirmedQuote,
  accountId,
  poolAssetId,
}) => {
  const mixpanel = getMixPanel()
  const history = useHistory()
  const translate = useTranslate()
  const { history: browserHistory } = useBrowserRouter()
  const wallet = useWallet().state.wallet
  const { isSnapInstalled } = useIsSnapInstalled()

  const [slippageFiatUserCurrency, setSlippageFiatUserCurrency] = useState<string | undefined>()
  const [isSlippageLoading, setIsSlippageLoading] = useState(false)
  const [position, setPosition] = useState<UserLpDataPosition | undefined>()
  const [positionRuneAccountId, setPositionRuneAccountId] = useState<AccountId | undefined>()
  const [percentageSelection, setPercentageSelection] = useState<number>(INITIAL_REMOVAL_PERCENTAGE)
  const [sliderValue, setSliderValue] = useState<number>(INITIAL_REMOVAL_PERCENTAGE)
  const [shareOfPoolDecimalPercent, setShareOfPoolDecimalPercent] = useState<string | undefined>()
  const [shouldShowWarningAcknowledgement, setShouldShowWarningAcknowledgement] = useState(false)

  const { assetId, opportunityType } = useMemo(
    () => fromOpportunityId(opportunityId),
    [opportunityId],
  )
  const [withdrawType, setWithdrawType] = useState<OpportunityType>(opportunityType)

  // Virtual as in, these are the amounts if removing symetrically. But a user may remove asymetrically, so these are not the *actual* amounts
  // Keeping these as virtual amounts is useful from a UI perspective, as it allows rebalancing to automagically work when switching from sym. type,
  // while using the *actual* amounts whenever we do things like checking for asset balance
  const [virtualAssetWithdrawAmountCryptoPrecision, setVirtualAssetWithdrawAmountCryptoPrecision] =
    useState<string | undefined>()
  const [
    virtualAssetWithdrawAmountFiatUserCurrency,
    setVirtualAssetWithdrawAmountFiatUserCurrency,
  ] = useState<string | undefined>()
  const [virtualRuneWithdrawAmountCryptoPrecision, setVirtualRuneWithdrawAmountCryptoPrecision] =
    useState<string | undefined>()
  const [virtualRuneWithdrawAmountFiatUserCurrency, setVirtualRuneWithdrawAmountFiatUserCurrency] =
    useState<string | undefined>()

  const { data: pool } = usePool(poolAssetId)
  const { data: userLpData } = useUserLpData({ assetId })

  const firstRuneAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, thorchainChainId),
  )

  const runeAccountIds = useAppSelector(state =>
    selectAccountIdsByAssetId(state, { assetId: thorchainAssetId }),
  )
  const poolAsset = useAppSelector(state => selectAssetById(state, assetId))
  const poolAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId),
  )
  const poolAssetFeeAsset = useAppSelector(state => selectFeeAssetById(state, assetId))
  const poolAssetFeeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, poolAssetFeeAsset?.assetId ?? ''),
  )
  const poolAssetFeeAssetBalanceFilter = useMemo(() => {
    return { assetId: poolAssetFeeAsset?.assetId, accountId }
  }, [poolAssetFeeAsset, accountId])
  const poolAssetFeeAssetBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, poolAssetFeeAssetBalanceFilter),
  )

  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const runeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId),
  )
  const runeBalanceFilter = useMemo(() => {
    return { assetId: runeAsset?.assetId, accountId: positionRuneAccountId }
  }, [runeAsset, positionRuneAccountId])
  const runeBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, runeBalanceFilter),
  )

  const { isTradingActive, isLoading: isTradingActiveLoading } = useIsTradingActive({
    assetId: poolAsset?.assetId,
    swapperName: SwapperName.Thorchain,
  })

  const isThorchainLpWithdrawEnabled = useFeatureFlag('ThorchainLpWithdraw')

  const currentAccountIdByChainId = useMemo(() => {
    if (!poolAsset) return {}
    return {
      [poolAsset.chainId]: accountId,
      // @TODO: Support multi accounts, but it's currently not supported anywhere in the Thorchain LP feature
      [thorchainChainId]: positionRuneAccountId ?? firstRuneAccountId,
    }
  }, [accountId, poolAsset, positionRuneAccountId, firstRuneAccountId])

  const actualAssetWithdrawAmountCryptoPrecision = useMemo(() => {
    switch (withdrawType) {
      // Symmetrical: assetAmount = virtual amount (no deposit rebalance, so use current asset value as is)
      case 'sym':
        return virtualAssetWithdrawAmountCryptoPrecision
      // Asym Asset: assetAmount = virtual amount times 2 (deposit 50:50 rebalance asset->rune, so current rune value will be swapped into asset before withdrawal)
      case AsymSide.Asset:
        return bnOrZero(virtualAssetWithdrawAmountCryptoPrecision).times(2).toFixed()
      // Asym Rune: assetAmount = '0' (deposit 50:50 rebalance rune -> asset, so current asset value will be swapped into rune before withdrawal)
      case AsymSide.Rune:
        return '0'
      default:
        assertUnreachable(withdrawType)
    }
  }, [withdrawType, virtualAssetWithdrawAmountCryptoPrecision])

  const actualRuneWithdrawAmountCryptoPrecision = useMemo(() => {
    switch (withdrawType) {
      // Symmetrical: runeAmount = virtual amount (no deposit rebalance, so use current rune value as is)
      case 'sym':
        return virtualRuneWithdrawAmountCryptoPrecision
      // Asym Rune: runeAmount = virtual amount times 2 (deposit 50:50 rebalance rune->asset, so current asset value will be swapped into rune before withdrawal)
      case AsymSide.Rune:
        return bnOrZero(virtualRuneWithdrawAmountCryptoPrecision).times(2).toFixed()
      // Asym Asset: runeAmount = '0' (deposit 50:50 rebalance asset->rune, so current rune value will be swapped into asset before withdrawal)
      case AsymSide.Asset:
        return '0'
      default:
        assertUnreachable(withdrawType)
    }
  }, [withdrawType, virtualRuneWithdrawAmountCryptoPrecision])

  const actualAssetWithdrawAmountFiatUserCurrency = useMemo(() => {
    switch (withdrawType) {
      // Symmetrical: assetAmount = virtual amount (no deposit rebalance, so use current asset value as is)
      case 'sym':
        return virtualAssetWithdrawAmountFiatUserCurrency
      // Asym Asset: assetAmount = virtual amount times 2 (deposit 50:50 rebalance asset->rune, so current rune value will be swapped into asset before withdrawal)
      case AsymSide.Asset:
        return bnOrZero(virtualAssetWithdrawAmountFiatUserCurrency).times(2).toFixed()
      // Asym Rune: assetAmount = '0' (deposit 50:50 rebalance rune -> asset, so current asset value will be swapped into rune before withdrawal)
      case AsymSide.Rune:
        return '0'
      default:
        assertUnreachable(withdrawType)
    }
  }, [withdrawType, virtualAssetWithdrawAmountFiatUserCurrency])

  const actualRuneWithdrawAmountFiatUserCurrency = useMemo(() => {
    switch (withdrawType) {
      // Symmetrical: runeAmount = virtual amount (no deposit rebalance, so use current rune value as is)
      case 'sym':
        return virtualRuneWithdrawAmountFiatUserCurrency
      // Asym Rune: runeAmount = virtual amount times 2 (deposit 50:50 rebalance rune->asset, so current asset value will be swapped into rune before withdrawal)
      case AsymSide.Rune:
        return bnOrZero(virtualRuneWithdrawAmountFiatUserCurrency).times(2).toFixed()
      // Asym Asset: runeAmount = '0' (deposit 50:50 rebalance asset->rune, so current rune value will be swapped into asset before withdrawal)
      case AsymSide.Asset:
        return '0'
      default:
        assertUnreachable(withdrawType)
    }
  }, [withdrawType, virtualRuneWithdrawAmountFiatUserCurrency])

  const incompleteSide = useMemo(() => {
    if (!position?.status.incomplete) return

    return position.status.incomplete.asset.assetId === thorchainAssetId
      ? AsymSide.Rune
      : AsymSide.Asset
  }, [position])

  const validInputAmount = useMemo(() => {
    if (incompleteSide === AsymSide.Asset) {
      return bnOrZero(virtualRuneWithdrawAmountCryptoPrecision).gt(0)
    }

    if (incompleteSide === AsymSide.Rune) {
      return bnOrZero(virtualAssetWithdrawAmountCryptoPrecision).gt(0)
    }

    switch (withdrawType) {
      case 'sym':
        return (
          bnOrZero(virtualAssetWithdrawAmountCryptoPrecision).gt(0) &&
          bnOrZero(virtualRuneWithdrawAmountCryptoPrecision).gt(0)
        )
      case AsymSide.Rune:
        return bnOrZero(virtualRuneWithdrawAmountCryptoPrecision).gt(0)
      case AsymSide.Asset:
        return bnOrZero(virtualAssetWithdrawAmountCryptoPrecision).gt(0)
      default:
        assertUnreachable(withdrawType)
    }
  }, [
    incompleteSide,
    withdrawType,
    virtualAssetWithdrawAmountCryptoPrecision,
    virtualRuneWithdrawAmountCryptoPrecision,
  ])

  useEffect(() => {
    if (!userLpData) return

    const _position = userLpData.find(data => data.opportunityId === opportunityId)
    if (!_position) return

    if (_position?.status.incomplete) {
      setSliderValue(100)
      setPercentageSelection(100)
    }

    setPosition(_position)

    const runeAddress = _position?.runeAddress
    if (!runeAddress) return

    const _positionRuneAccountId = toAccountId({
      chainId: thorchainChainId,
      account: runeAddress,
    })

    setPositionRuneAccountId(_positionRuneAccountId)
  }, [opportunityId, userLpData])

  const handleBackClick = useCallback(() => {
    browserHistory.push('/pools')
  }, [browserHistory])

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

    setVirtualRuneWithdrawAmountCryptoPrecision(
      bnOrZero(position.underlyingRuneAmountCryptoPrecision)
        .plus(position.pendingRuneAmountCryptoPrecision)
        .times(percentageSelection / 100)
        .toFixed(),
    )
    setVirtualRuneWithdrawAmountFiatUserCurrency(
      bnOrZero(position.underlyingRuneAmountFiatUserCurrency)
        .plus(position.pendingRuneAmountFiatUserCurrency)
        .times(percentageSelection / 100)
        .toFixed(),
    )
    setVirtualAssetWithdrawAmountCryptoPrecision(
      bnOrZero(position.underlyingAssetAmountCryptoPrecision)
        .plus(position.pendingAssetAmountCryptoPrecision)
        .times(percentageSelection / 100)
        .toFixed(),
    )
    setVirtualAssetWithdrawAmountFiatUserCurrency(
      bnOrZero(position.underlyingAssetAmountFiatUserCurrency)
        .plus(position.pendingAssetAmountFiatUserCurrency)
        .times(percentageSelection / 100)
        .toFixed(),
    )
  }, [percentageSelection, position])

  const memo = useMemo(() => {
    const withdrawalBps = convertPercentageToBasisPoints(percentageSelection).toFixed()
    return `-:${poolAssetId}:${withdrawalBps}`
  }, [poolAssetId, percentageSelection])

  const {
    estimatedFeesData: estimatedRuneFeesData,
    isEstimatedFeesDataLoading: isEstimatedRuneFeesDataLoading,
    isEstimatedFeesDataError: isEstimatedRuneFeesDataError,
    dustAmountCryptoBaseUnit: runeDustAmountCryptoBaseUnit,
  } = useSendThorTx({
    assetId: thorchainAssetId,
    accountId: positionRuneAccountId ?? null,
    // withdraw liquidity will use dust amount
    amountCryptoBaseUnit: null,
    memo,
    fromAddress: null,
    action: 'withdrawLiquidity',
    enableEstimateFees: Boolean(withdrawType !== AsymSide.Asset),
  })

  const poolAssetAccountMetadataFilter = useMemo(() => ({ accountId }), [accountId])
  const poolAssetAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, poolAssetAccountMetadataFilter),
  )

  const { data: poolAssetAccountAddress } = useQuery({
    ...reactQueries.common.thorchainFromAddress({
      accountId,
      assetId: poolAsset?.assetId!,
      opportunityId,
      wallet: wallet!,
      accountMetadata: poolAssetAccountMetadata!,
      getPosition: getThorchainLpPosition,
    }),
    enabled: Boolean(poolAsset?.assetId && wallet && poolAssetAccountMetadata),
  })

  const {
    estimatedFeesData: estimatedPoolAssetFeesData,
    isEstimatedFeesDataLoading: isEstimatedPoolAssetFeesDataLoading,
    isEstimatedFeesDataError: isEstimatedPoolAssetFeesDataError,
    dustAmountCryptoBaseUnit: poolAssetFeeAssetDustAmountCryptoBaseUnit,
    outboundFeeCryptoBaseUnit,
  } = useSendThorTx({
    // Asym asset withdraws are the only ones occurring an asset Tx - both sym and asym RUNE side withdraws occur a RUNE Tx instead
    enableEstimateFees: Boolean(withdrawType === AsymSide.Asset),
    assetId: poolAsset?.assetId,
    accountId,
    // withdraw liquidity will use dust amount
    amountCryptoBaseUnit: null,
    memo,
    fromAddress: poolAssetAccountAddress ?? null,
    action: 'withdrawLiquidity',
  })

  const poolAssetProtocolFeeCryptoPrecision = useMemo(() => {
    if (!poolAssetFeeAsset || !outboundFeeCryptoBaseUnit) return bn(0)
    if (bnOrZero(actualAssetWithdrawAmountCryptoPrecision).eq(0)) return bn(0)
    return bnOrZero(fromBaseUnit(outboundFeeCryptoBaseUnit, poolAssetFeeAsset.precision))
  }, [outboundFeeCryptoBaseUnit, actualAssetWithdrawAmountCryptoPrecision, poolAssetFeeAsset])

  const poolAssetProtocolFeeFiatUserCurrency = useMemo(() => {
    return poolAssetProtocolFeeCryptoPrecision.times(poolAssetFeeAssetMarketData.price)
  }, [poolAssetFeeAssetMarketData.price, poolAssetProtocolFeeCryptoPrecision])

  const poolAssetTxFeeCryptoPrecision = useMemo(
    () =>
      fromBaseUnit(
        estimatedPoolAssetFeesData?.txFeeCryptoBaseUnit ?? 0,
        poolAssetFeeAsset?.precision ?? 0,
      ),
    [estimatedPoolAssetFeesData?.txFeeCryptoBaseUnit, poolAssetFeeAsset?.precision],
  )

  const poolAssetGasFeeFiatUserCurrency = useMemo(
    () => bnOrZero(poolAssetTxFeeCryptoPrecision).times(poolAssetFeeAssetMarketData.price),
    [poolAssetFeeAssetMarketData.price, poolAssetTxFeeCryptoPrecision],
  )

  const runeProtocolFeeCryptoPrecision = useMemo(() => {
    if (bnOrZero(actualRuneWithdrawAmountCryptoPrecision).eq(0)) return bn(0)
    return fromThorBaseUnit(THORCHAIN_OUTBOUND_FEE_RUNE_THOR_UNIT)
  }, [actualRuneWithdrawAmountCryptoPrecision])

  const runeProtocolFeeFiatUserCurrency = useMemo(() => {
    return runeProtocolFeeCryptoPrecision.times(runeMarketData.price)
  }, [runeMarketData, runeProtocolFeeCryptoPrecision])

  const runeTxFeeCryptoPrecision = useMemo(
    () => fromBaseUnit(estimatedRuneFeesData?.txFeeCryptoBaseUnit ?? 0, runeAsset?.precision ?? 0),
    [estimatedRuneFeesData?.txFeeCryptoBaseUnit, runeAsset?.precision],
  )

  const runeGasFeeFiatUserCurrency = useMemo(
    () => bnOrZero(runeTxFeeCryptoPrecision).times(runeMarketData.price),
    [runeMarketData.price, runeTxFeeCryptoPrecision],
  )

  const totalProtocolFeeFiatUserCurrency = useMemo(() => {
    return poolAssetProtocolFeeFiatUserCurrency.plus(runeProtocolFeeFiatUserCurrency).toFixed()
  }, [poolAssetProtocolFeeFiatUserCurrency, runeProtocolFeeFiatUserCurrency])

  const totalGasFeeFiatUserCurrency = useMemo(
    () => poolAssetGasFeeFiatUserCurrency.plus(runeGasFeeFiatUserCurrency),
    [poolAssetGasFeeFiatUserCurrency, runeGasFeeFiatUserCurrency],
  )

  const handlePercentageClick = useCallback((percentage: number) => {
    return () => {
      setSliderValue(percentage)
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

  const runePerAsset = useMemo(() => pool?.assetPrice, [pool])

  const createHandleRemoveLiquidityInputChange = useCallback(
    (marketData: MarketData, isRune: boolean) => {
      return (value: string, isFiat?: boolean) => {
        if (!poolAsset || !marketData) return

        const amountCryptoPrecision = (() => {
          if (!isFiat) return value
          return bnOrZero(value)
            .div(bn(marketData.price ?? '0'))
            .toFixed()
        })()

        const amountFiatUserCurrency = (() => {
          if (isFiat) return value
          return bnOrZero(value)
            .times(bn(marketData.price ?? '0'))
            .toFixed()
        })()

        if (isRune && bnOrZero(runePerAsset).isGreaterThan(0)) {
          setVirtualRuneWithdrawAmountCryptoPrecision(amountCryptoPrecision)
          setVirtualRuneWithdrawAmountFiatUserCurrency(amountFiatUserCurrency)
          setVirtualAssetWithdrawAmountFiatUserCurrency(amountFiatUserCurrency)
          setVirtualAssetWithdrawAmountCryptoPrecision(
            bnOrZero(amountCryptoPrecision).div(bnOrZero(runePerAsset)).toFixed(),
          )
        } else if (!isRune && bnOrZero(runePerAsset).isGreaterThan(0)) {
          setVirtualAssetWithdrawAmountCryptoPrecision(amountCryptoPrecision)
          setVirtualAssetWithdrawAmountFiatUserCurrency(amountFiatUserCurrency)
          setVirtualRuneWithdrawAmountFiatUserCurrency(amountFiatUserCurrency)
          setVirtualRuneWithdrawAmountCryptoPrecision(
            bnOrZero(amountCryptoPrecision).times(bnOrZero(runePerAsset)).toFixed(),
          )
        }
      }
    },
    [poolAsset, runePerAsset],
  )

  useEffect(() => {
    ;(async () => {
      if (!position) return
      if (!poolAsset) return
      if (!actualRuneWithdrawAmountCryptoPrecision) return
      if (!actualAssetWithdrawAmountCryptoPrecision) return

      setIsSlippageLoading(true)

      const runeAmountThorBaseUnit = convertPrecision({
        value: actualRuneWithdrawAmountCryptoPrecision,
        inputExponent: 0,
        outputExponent: THOR_PRECISION,
      }).toFixed()

      const assetAmountThorBaseUnit = convertPrecision({
        value: actualAssetWithdrawAmountCryptoPrecision,
        inputExponent: 0,
        outputExponent: THOR_PRECISION,
      }).toFixed()

      const estimate = await estimateRemoveThorchainLiquidityPosition({
        liquidityUnits: position?.liquidityUnits,
        bps: convertPercentageToBasisPoints(percentageSelection).toFixed(),
        assetId: poolAsset.assetId,
        runeAmountThorBaseUnit,
        assetAmountThorBaseUnit,
      })

      const _slippageFiatUserCurrency = bnOrZero(estimate.slippageRuneCryptoPrecision)
        .times(runeMarketData.price)
        .toFixed()

      setSlippageFiatUserCurrency(withdrawType !== 'sym' ? _slippageFiatUserCurrency : '0')
      setIsSlippageLoading(false)
      setShareOfPoolDecimalPercent(estimate.poolShareDecimalPercent)
    })()
  }, [
    actualAssetWithdrawAmountCryptoPrecision,
    actualRuneWithdrawAmountCryptoPrecision,
    withdrawType,
    percentageSelection,
    poolAsset,
    position,
    runeMarketData.price,
  ])

  useEffect(() => {
    if (!poolAsset) return
    if (!slippageFiatUserCurrency) return
    if (!opportunityId) return
    if (!withdrawType) return
    if (!actualAssetWithdrawAmountCryptoPrecision) return
    if (!actualAssetWithdrawAmountFiatUserCurrency) return
    if (!actualRuneWithdrawAmountCryptoPrecision) return
    if (!actualRuneWithdrawAmountFiatUserCurrency) return
    if (!shareOfPoolDecimalPercent) return
    if (!currentAccountIdByChainId) return

    setConfirmedQuote({
      assetWithdrawAmountCryptoPrecision: actualAssetWithdrawAmountCryptoPrecision,
      assetWithdrawAmountFiatUserCurrency: actualAssetWithdrawAmountFiatUserCurrency,
      runeWithdrawAmountCryptoPrecision: actualRuneWithdrawAmountCryptoPrecision,
      runeWithdrawAmountFiatUserCurrency: actualRuneWithdrawAmountFiatUserCurrency,
      shareOfPoolDecimalPercent,
      slippageFiatUserCurrency,
      opportunityId,
      withdrawSide: withdrawType,
      runeGasFeeFiatUserCurrency: runeGasFeeFiatUserCurrency.toFixed(2),
      poolAssetGasFeeFiatUserCurrency: poolAssetGasFeeFiatUserCurrency.toFixed(2),
      totalGasFeeFiatUserCurrency: totalGasFeeFiatUserCurrency.toFixed(2),
      feeBps: '0',
      withdrawalBps: convertPercentageToBasisPoints(percentageSelection).toString(),
      currentAccountIdByChainId,
      assetAddress: poolAssetAccountAddress,
      positionStatus: position?.status,
    })
  }, [
    actualAssetWithdrawAmountCryptoPrecision,
    actualAssetWithdrawAmountFiatUserCurrency,
    actualRuneWithdrawAmountCryptoPrecision,
    actualRuneWithdrawAmountFiatUserCurrency,
    opportunityId,
    accountId,
    percentageSelection,
    poolAsset,
    poolAssetGasFeeFiatUserCurrency,
    position,
    positionRuneAccountId,
    runeGasFeeFiatUserCurrency,
    setConfirmedQuote,
    shareOfPoolDecimalPercent,
    slippageFiatUserCurrency,
    totalGasFeeFiatUserCurrency,
    currentAccountIdByChainId,
    poolAssetAccountAddress,
    withdrawType,
  ])

  const isDeposit = useMemo(() => isLpConfirmedDepositQuote(confirmedQuote), [confirmedQuote])
  const isSymWithdraw = useMemo(
    () => withdrawType === 'sym' && !isDeposit,
    [isDeposit, withdrawType],
  )
  const isSweepNeededArgs = useMemo(
    () => ({
      assetId: poolAsset?.assetId,
      address: poolAssetAccountAddress,
      amountCryptoBaseUnit: toBaseUnit(
        actualAssetWithdrawAmountCryptoPrecision ?? 0,
        poolAsset?.precision ?? 0,
      ),
      txFeeCryptoBaseUnit: estimatedPoolAssetFeesData?.txFeeCryptoBaseUnit,
      // Don't fetch sweep needed if there isn't enough balance for the tx + fees, since adding in a sweep Tx would obviously fail too
      // also, use that as balance checks instead of our current one, at least for the asset (not ROON)
      enabled: Boolean(
        // Symmetrical withdraws do not occur an asset Tx, only a RUNE Tx, hence will never occur a sweep step
        !isSymWithdraw && bnOrZero(actualAssetWithdrawAmountCryptoPrecision).gt(0),
      ),
    }),
    [
      poolAsset?.assetId,
      poolAsset?.precision,
      poolAssetAccountAddress,
      actualAssetWithdrawAmountCryptoPrecision,
      estimatedPoolAssetFeesData?.txFeeCryptoBaseUnit,
      isSymWithdraw,
    ],
  )

  const { data: isSweepNeeded, isLoading: isSweepNeededLoading } =
    useIsSweepNeededQuery(isSweepNeededArgs)

  const handleSubmit = useCallback(() => {
    if (isSweepNeeded) return history.push(RemoveLiquidityRoutePaths.Sweep)

    if (incompleteSide) {
      mixpanel?.track(MixPanelEvent.LpIncompleteWithdrawPreview, confirmedQuote!)
    } else {
      mixpanel?.track(MixPanelEvent.LpWithdrawPreview, confirmedQuote!)
    }

    history.push(RemoveLiquidityRoutePaths.Confirm)
  }, [confirmedQuote, history, incompleteSide, isSweepNeeded, mixpanel])

  const tradeAssetInputs = useMemo(() => {
    if (!(poolAsset && runeAsset && withdrawType)) return null

    const assets: Asset[] = (() => {
      switch (withdrawType) {
        case AsymSide.Rune:
          return [runeAsset]
        case AsymSide.Asset:
          return [poolAsset]
        case 'sym':
          return [poolAsset, runeAsset]
        default:
          assertUnreachable(withdrawType)
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
            isRune
              ? virtualRuneWithdrawAmountCryptoPrecision
              : virtualAssetWithdrawAmountCryptoPrecision,
          )
            .times(withdrawType === 'sym' ? 1 : 2)
            .toFixed()
          const fiatAmount = bnOrZero(
            isRune
              ? virtualRuneWithdrawAmountFiatUserCurrency
              : virtualAssetWithdrawAmountFiatUserCurrency,
          )
            .times(withdrawType === 'sym' ? 1 : 2)
            .toFixed()
          const cryptoBalance = bnOrZero(
            isRune
              ? position?.underlyingRuneAmountCryptoPrecision
              : position?.underlyingAssetAmountCryptoPrecision,
          )
            .times(withdrawType === 'sym' ? 1 : 2)
            .toFixed()

          const fiatBalance = bnOrZero(
            isRune
              ? position?.underlyingRuneAmountFiatUserCurrency
              : position?.underlyingAssetAmountFiatUserCurrency,
          )
            .times(withdrawType === 'sym' ? 1 : 2)
            .toFixed()

          return (
            <TradeAssetInput
              key={asset.assetId}
              accountId={accountId}
              cryptoAmount={cryptoAmount}
              onChange={handleRemoveLiquidityInputChange}
              isAccountSelectionDisabled={true}
              fiatAmount={fiatAmount}
              // @TODO: support multiaccount if we really want to
              // eslint-disable-next-line
              onAccountIdChange={() => {}}
              rightComponent={ReadOnlyAsset}
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
    virtualRuneWithdrawAmountCryptoPrecision,
    virtualAssetWithdrawAmountCryptoPrecision,
    virtualRuneWithdrawAmountFiatUserCurrency,
    virtualAssetWithdrawAmountFiatUserCurrency,
    position,
    accountId,
    percentOptions,
    withdrawType,
  ])

  const divider = useMemo(() => <StackDivider borderColor='border.base' />, [])

  const walletSupportsRune = useMemo(
    () =>
      walletSupportsChain({
        chainId: thorchainChainId,
        wallet,
        isSnapInstalled,
        checkConnectedAccountIds: runeAccountIds,
      }),
    [isSnapInstalled, runeAccountIds, wallet],
  )

  const isUnsupportedWithdraw = useMemo(
    () => currentAccountIdByChainId[thorchainChainId] && !walletSupportsRune,
    [currentAccountIdByChainId, walletSupportsRune],
  )

  const hasEnoughPoolAssetFeeAssetBalanceForTx = useMemo(() => {
    // only asym asset withdrawals result in an asset transaction
    if (withdrawType !== AsymSide.Asset) return true
    if (bnOrZero(actualAssetWithdrawAmountCryptoPrecision).isZero()) return true
    if (!poolAssetFeeAsset) return false

    const poolAssetFeeAssetBalanceCryptoPrecision = fromBaseUnit(
      poolAssetFeeAssetBalanceCryptoBaseUnit,
      poolAssetFeeAsset?.precision,
    )

    const poolAssetFeeAssetDustAmountCryptoPrecision = fromBaseUnit(
      poolAssetFeeAssetDustAmountCryptoBaseUnit,
      poolAssetFeeAsset?.precision,
    )

    return bnOrZero(poolAssetTxFeeCryptoPrecision)
      .plus(poolAssetFeeAssetDustAmountCryptoPrecision)
      .lte(poolAssetFeeAssetBalanceCryptoPrecision)
  }, [
    actualAssetWithdrawAmountCryptoPrecision,
    withdrawType,
    poolAssetFeeAsset,
    poolAssetFeeAssetBalanceCryptoBaseUnit,
    poolAssetFeeAssetDustAmountCryptoBaseUnit,
    poolAssetTxFeeCryptoPrecision,
  ])

  const hasEnoughRuneBalanceForTx = useMemo(() => {
    // only sym and asym rune withdrawals result in a rune transaction
    if (withdrawType === AsymSide.Asset) return true
    if (bnOrZero(actualRuneWithdrawAmountCryptoPrecision).isZero()) return true
    if (!runeAsset) return false

    const runeBalanceCryptoPrecision = fromBaseUnit(runeBalanceCryptoBaseUnit, runeAsset?.precision)
    const runeDustAmountCryptoPrecision = fromBaseUnit(
      runeDustAmountCryptoBaseUnit,
      runeAsset?.precision,
    )

    return bnOrZero(runeTxFeeCryptoPrecision)
      .plus(runeDustAmountCryptoPrecision)
      .lte(runeBalanceCryptoPrecision)
  }, [
    actualRuneWithdrawAmountCryptoPrecision,
    withdrawType,
    runeAsset,
    runeBalanceCryptoBaseUnit,
    runeDustAmountCryptoBaseUnit,
    runeTxFeeCryptoPrecision,
  ])

  const isBelowMinimumWithdrawAmount = useMemo(() => {
    const totalWithdrawAmountFiatUserCurrency = bnOrZero(
      actualAssetWithdrawAmountFiatUserCurrency,
    ).plus(bnOrZero(actualRuneWithdrawAmountFiatUserCurrency))

    // Protocol fee buffers explained here: https://gitlab.com/thorchain/thornode/-/blob/develop/x/thorchain/querier_quotes.go#L461
    return bnOrZero(slippageFiatUserCurrency)
      .plus(bnOrZero(poolAssetProtocolFeeFiatUserCurrency).times(4))
      .plus(bnOrZero(runeProtocolFeeFiatUserCurrency).times(2))
      .gte(totalWithdrawAmountFiatUserCurrency)
  }, [
    actualAssetWithdrawAmountFiatUserCurrency,
    actualRuneWithdrawAmountFiatUserCurrency,
    poolAssetProtocolFeeFiatUserCurrency,
    runeProtocolFeeFiatUserCurrency,
    slippageFiatUserCurrency,
  ])

  const errorCopy = useMemo(() => {
    if (isUnsupportedWithdraw) return translate('common.unsupportedNetwork')
    if (isTradingActive === false) return translate('common.poolHalted')
    if (!isThorchainLpWithdrawEnabled) return translate('common.poolDisabled')
    if (poolAssetFeeAsset && !hasEnoughPoolAssetFeeAssetBalanceForTx)
      return translate('modals.send.errors.notEnoughNativeToken', {
        asset: poolAssetFeeAsset.symbol,
      })
    if (runeAsset && !hasEnoughRuneBalanceForTx)
      return translate('modals.send.errors.notEnoughNativeToken', {
        asset: runeAsset.symbol,
      })
    return null
  }, [
    hasEnoughPoolAssetFeeAssetBalanceForTx,
    hasEnoughRuneBalanceForTx,
    isThorchainLpWithdrawEnabled,
    isTradingActive,
    isUnsupportedWithdraw,
    poolAssetFeeAsset,
    runeAsset,
    translate,
  ])

  const maybeOpportunityNotSupportedExplainer = useMemo(() => {
    if (!poolAsset || !runeAsset) return null
    if (!isUnsupportedWithdraw) return null

    return (
      <Alert status='error' mx={-2} width='auto'>
        <AlertIcon />
        <AlertDescription fontSize='sm' fontWeight='medium'>
          {translate('pools.unsupportedNetworkExplainer', { network: runeAsset.networkName })}
        </AlertDescription>
      </Alert>
    )
  }, [isUnsupportedWithdraw, poolAsset, runeAsset, translate])

  const confirmCopy = useMemo(() => {
    if (errorCopy) return errorCopy
    return translate('pools.removeLiquidity')
  }, [errorCopy, translate])

  const handleSubmitIntent = useCallback(() => {
    if (isBelowMinimumWithdrawAmount) {
      // @TODO: verify if it applies to RUNEPool as well
      setShouldShowWarningAcknowledgement(true)
    } else {
      handleSubmit()
    }
  }, [handleSubmit, isBelowMinimumWithdrawAmount])

  const handleAsymSideChange = useCallback((asymSide: string | null) => {
    if (!asymSide) return

    setWithdrawType(asymSide as OpportunityType)
  }, [])

  if (!poolAsset || !poolAssetFeeAsset || !runeAsset) return null

  return (
    <SlideTransition>
      <WarningAcknowledgement
        message={translate('defi.modals.saversVaults.dangerousWithdrawWarning')}
        onAcknowledge={handleSubmit}
        shouldShowAcknowledgement={shouldShowWarningAcknowledgement}
        setShouldShowAcknowledgement={setShouldShowWarningAcknowledgement}
      >
        {renderHeader}
        <Stack divider={divider} spacing={4} pb={4}>
          <Stack>
            <FormLabel mb={0} px={6} fontSize='sm'>
              {translate('pools.removeAmounts')}
            </FormLabel>
            <LpType
              assetId={poolAsset.assetId}
              opportunityId={opportunityId}
              isWithdraw={true}
              onAsymSideChange={handleAsymSideChange}
            />
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
                <Amount.Fiat value={slippageFiatUserCurrency ?? ''} />
              </Skeleton>
            </Row.Value>
          </Row>
          <Row fontSize='sm' fontWeight='medium'>
            <Row.Label>{translate('common.gasFee')}</Row.Label>
            <Row.Value>
              <Skeleton
                isLoaded={
                  (!isEstimatedPoolAssetFeesDataLoading || withdrawType === AsymSide.Rune) &&
                  (!isEstimatedRuneFeesDataLoading || withdrawType === AsymSide.Asset)
                }
              >
                <Amount.Fiat value={confirmedQuote?.totalGasFeeFiatUserCurrency ?? 0} />
              </Skeleton>
            </Row.Value>
          </Row>
          <Row fontSize='sm' fontWeight='medium'>
            <Row.Label>{translate('trade.protocolFee')}</Row.Label>
            <Row.Value>
              <Amount.Fiat value={totalProtocolFeeFiatUserCurrency} />
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
          {position?.status.incomplete && (
            <Alert status='info' mx={-2} width='auto'>
              <AlertIcon as={BiSolidBoltCircle} />
              <AlertDescription fontSize='sm' fontWeight='medium'>
                {translate('pools.incompletePositionWithdrawAlert')}
              </AlertDescription>
            </Alert>
          )}
          {maybeOpportunityNotSupportedExplainer}
          <Button
            mx={-2}
            size='lg'
            colorScheme={errorCopy ? 'red' : 'blue'}
            onClick={handleSubmitIntent}
            isDisabled={
              isUnsupportedWithdraw ||
              isTradingActive === false ||
              !isThorchainLpWithdrawEnabled ||
              !hasEnoughPoolAssetFeeAssetBalanceForTx ||
              !hasEnoughRuneBalanceForTx ||
              !confirmedQuote ||
              (isEstimatedPoolAssetFeesDataError && withdrawType !== AsymSide.Rune) ||
              (isEstimatedRuneFeesDataError && withdrawType !== AsymSide.Asset) ||
              !validInputAmount ||
              isSweepNeededLoading
            }
            isLoading={
              isTradingActiveLoading ||
              (isEstimatedPoolAssetFeesDataLoading && withdrawType !== AsymSide.Rune) ||
              (isEstimatedRuneFeesDataLoading && withdrawType !== AsymSide.Asset) ||
              isSweepNeededLoading
            }
          >
            {confirmCopy}
          </Button>
        </CardFooter>
      </WarningAcknowledgement>
    </SlideTransition>
  )
}
