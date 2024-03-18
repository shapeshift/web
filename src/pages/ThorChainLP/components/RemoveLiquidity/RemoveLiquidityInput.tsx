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
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { THORCHAIN_OUTBOUND_FEE_RUNE_THOR_UNIT } from 'lib/swapper/swappers/ThorchainSwapper/constants'
import { assertUnreachable } from 'lib/utils'
import { fromThorBaseUnit, getThorchainFromAddress } from 'lib/utils/thorchain'
import { THOR_PRECISION, THORCHAIN_POOL_MODULE_ADDRESS } from 'lib/utils/thorchain/constants'
import {
  estimateRemoveThorchainLiquidityPosition,
  getThorchainLpTransactionType,
} from 'lib/utils/thorchain/lp'
import type { LpConfirmedWithdrawalQuote, UserLpDataPosition } from 'lib/utils/thorchain/lp/types'
import { AsymSide } from 'lib/utils/thorchain/lp/types'
import { isLpConfirmedDepositQuote } from 'lib/utils/thorchain/lp/utils'
import { useIsSweepNeededQuery } from 'pages/Lending/hooks/useIsSweepNeededQuery'
import { usePool } from 'pages/ThorChainLP/queries/hooks/usePool'
import { useUserLpData } from 'pages/ThorChainLP/queries/hooks/useUserLpData'
import { getThorchainLpPosition } from 'pages/ThorChainLP/queries/queries'
import { fromOpportunityId } from 'pages/ThorChainLP/utils'
import { THORCHAIN_SAVERS_DUST_THRESHOLDS_CRYPTO_BASE_UNIT } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import {
  selectAccountIdsByAssetId,
  selectAssetById,
  selectFeeAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioAccountMetadataByAccountId,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from 'state/slices/selectors'
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
  const isSnapInstalled = useIsSnapInstalled()

  const [slippageFiatUserCurrency, setSlippageFiatUserCurrency] = useState<string | undefined>()
  const [isSlippageLoading, setIsSlippageLoading] = useState(false)
  const [position, setPosition] = useState<UserLpDataPosition | undefined>()
  const [runeAccountId, setRuneAccountId] = useState<AccountId | undefined>()
  const [percentageSelection, setPercentageSelection] = useState<number>(INITIAL_REMOVAL_PERCENTAGE)
  const [sliderValue, setSliderValue] = useState<number>(INITIAL_REMOVAL_PERCENTAGE)
  const [shareOfPoolDecimalPercent, setShareOfPoolDecimalPercent] = useState<string | undefined>()
  const [poolAssetAccountAddress, setPoolAssetAccountAddress] = useState<string | undefined>(
    undefined,
  )

  const { assetId, type: opportunityType } = useMemo(
    () => fromOpportunityId(opportunityId),
    [opportunityId],
  )

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
    return { assetId: runeAsset?.assetId, accountId: runeAccountId }
  }, [runeAsset, runeAccountId])
  const runeBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, runeBalanceFilter),
  )

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

  const currentAccountIdByChainId = useMemo(() => {
    if (!poolAsset) return {}
    return {
      [poolAsset.chainId]: accountId,
      [thorchainChainId]: runeAccountId ?? '',
    }
  }, [accountId, poolAsset, runeAccountId])

  const actualAssetWithdrawAmountCryptoPrecision = useMemo(() => {
    switch (opportunityType) {
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
        assertUnreachable(opportunityType)
    }
  }, [opportunityType, virtualAssetWithdrawAmountCryptoPrecision])

  const actualRuneWithdrawAmountCryptoPrecision = useMemo(() => {
    switch (opportunityType) {
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
        assertUnreachable(opportunityType)
    }
  }, [opportunityType, virtualRuneWithdrawAmountCryptoPrecision])

  const actualAssetWithdrawAmountFiatUserCurrency = useMemo(() => {
    switch (opportunityType) {
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
        assertUnreachable(opportunityType)
    }
  }, [opportunityType, virtualAssetWithdrawAmountFiatUserCurrency])

  const actualRuneWithdrawAmountFiatUserCurrency = useMemo(() => {
    switch (opportunityType) {
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
        assertUnreachable(opportunityType)
    }
  }, [opportunityType, virtualRuneWithdrawAmountFiatUserCurrency])

  const validInputAmount = useMemo(() => {
    switch (opportunityType) {
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
        assertUnreachable(opportunityType)
    }
  }, [
    opportunityType,
    virtualAssetWithdrawAmountCryptoPrecision,
    virtualRuneWithdrawAmountCryptoPrecision,
  ])

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

    setVirtualRuneWithdrawAmountCryptoPrecision(
      bnOrZero(underlyingRuneAmountCryptoPrecision)
        .times(percentageSelection / 100)
        .toFixed(),
    )
    setVirtualRuneWithdrawAmountFiatUserCurrency(
      bnOrZero(underlyingRuneValueFiatUserCurrency)
        .times(percentageSelection / 100)
        .toFixed(),
    )
    setVirtualAssetWithdrawAmountFiatUserCurrency(
      bnOrZero(underlyingAssetValueFiatUserCurrency)
        .times(percentageSelection / 100)
        .toFixed(),
    )
    setVirtualAssetWithdrawAmountCryptoPrecision(
      bnOrZero(underlyingAssetAmountCryptoPrecision)
        .times(percentageSelection / 100)
        .toFixed(),
    )
  }, [percentageSelection, position])

  const poolAssetFeeAssetDustAmountCryptoPrecision = useMemo(() => {
    if (!poolAssetFeeAsset) return '0'
    const dustAmountCryptoBaseUnit =
      THORCHAIN_SAVERS_DUST_THRESHOLDS_CRYPTO_BASE_UNIT[poolAssetFeeAsset?.assetId] ?? '0'
    return fromBaseUnit(dustAmountCryptoBaseUnit, poolAssetFeeAsset?.precision)
  }, [poolAssetFeeAsset])

  const runeDustAmountCryptoPrecision = useMemo(() => {
    if (!runeAsset) return '0'
    const dustAmountCryptoBaseUnit =
      THORCHAIN_SAVERS_DUST_THRESHOLDS_CRYPTO_BASE_UNIT[runeAsset?.assetId] ?? '0'
    return fromBaseUnit(dustAmountCryptoBaseUnit, runeAsset?.precision)
  }, [runeAsset])

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
    repaymentAmountCryptoPrecision: runeDustAmountCryptoPrecision,
    confirmedQuote,
  })

  const {
    data: estimatedPoolAssetFeesData,
    isLoading: isEstimatedPoolAssetFeesDataLoading,
    isError: isEstimatedPoolAssetFeesDataError,
  } = useQuoteEstimatedFeesQuery({
    // Sym opportunities do *not* require a pool asset Tx, all we need is a RUNE Tx to trigger the withdraw
    enabled: opportunityType !== 'sym',
    collateralAssetId: poolAssetFeeAsset?.assetId ?? '',
    collateralAccountId: accountId,
    repaymentAccountId: accountId,
    repaymentAsset: poolAssetFeeAsset ?? null,
    confirmedQuote,
    repaymentAmountCryptoPrecision: poolAssetFeeAssetDustAmountCryptoPrecision,
  })

  const poolAssetProtocolFeeCryptoPrecision = useMemo(() => {
    if (opportunityType === AsymSide.Rune) return bn(0)
    return fromThorBaseUnit(inboundAddressesData?.outbound_fee ?? '0')
  }, [inboundAddressesData?.outbound_fee, opportunityType])

  const poolAssetProtocolFeeFiatUserCurrency = useMemo(() => {
    return poolAssetProtocolFeeCryptoPrecision.times(poolAssetMarketData.price)
  }, [poolAssetMarketData, poolAssetProtocolFeeCryptoPrecision])

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
    if (opportunityType === AsymSide.Asset) return bn(0)
    return fromThorBaseUnit(THORCHAIN_OUTBOUND_FEE_RUNE_THOR_UNIT)
  }, [opportunityType])

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
        bps: bnOrZero(percentageSelection).times(100).toFixed(),
        assetId: poolAsset.assetId,
        runeAmountThorBaseUnit,
        assetAmountThorBaseUnit,
      })

      const _slippageFiatUserCurrency = bnOrZero(estimate.slippageRuneCryptoPrecision)
        .times(runeMarketData.price)
        .toFixed()

      setSlippageFiatUserCurrency(_slippageFiatUserCurrency)
      setIsSlippageLoading(false)
      setShareOfPoolDecimalPercent(estimate.poolShareDecimalPercent)
    })()
  }, [
    position,
    poolAsset,
    runeMarketData.price,
    actualAssetWithdrawAmountCryptoPrecision,
    actualRuneWithdrawAmountCryptoPrecision,
    percentageSelection,
  ])

  useEffect(() => {
    if (!poolAsset) return
    if (!slippageFiatUserCurrency) return
    if (!opportunityId) return
    if (!actualAssetWithdrawAmountCryptoPrecision) return
    if (!actualAssetWithdrawAmountFiatUserCurrency) return
    if (!actualRuneWithdrawAmountCryptoPrecision) return
    if (!actualRuneWithdrawAmountFiatUserCurrency) return
    if (!shareOfPoolDecimalPercent) return
    if (!poolAssetInboundAddress) return

    setConfirmedQuote({
      assetWithdrawAmountCryptoPrecision: actualAssetWithdrawAmountCryptoPrecision,
      assetWithdrawAmountFiatUserCurrency: actualAssetWithdrawAmountFiatUserCurrency,
      runeWithdrawAmountCryptoPrecision: actualRuneWithdrawAmountCryptoPrecision,
      runeWithdrawAmountFiatUserCurrency: actualRuneWithdrawAmountFiatUserCurrency,
      shareOfPoolDecimalPercent,
      slippageFiatUserCurrency,
      opportunityId,
      quoteInboundAddress: poolAssetInboundAddress,
      runeGasFeeFiatUserCurrency: runeGasFeeFiatUserCurrency.toFixed(2),
      poolAssetGasFeeFiatUserCurrency: poolAssetGasFeeFiatUserCurrency.toFixed(2),
      totalGasFeeFiatUserCurrency: totalGasFeeFiatUserCurrency.toFixed(2),
      feeBps: '0',
      withdrawalBps: bnOrZero(percentageSelection).times(100).toString(),
      currentAccountIdByChainId,
      assetAddress: poolAssetAccountAddress,
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
    poolAssetInboundAddress,
    runeAccountId,
    runeGasFeeFiatUserCurrency,
    setConfirmedQuote,
    shareOfPoolDecimalPercent,
    slippageFiatUserCurrency,
    totalGasFeeFiatUserCurrency,
    currentAccountIdByChainId,
    poolAssetAccountAddress,
  ])

  const poolAssetAccountMetadataFilter = useMemo(() => ({ accountId }), [accountId])
  const poolAssetAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, poolAssetAccountMetadataFilter),
  )

  useEffect(() => {
    if (!(wallet && poolAsset && opportunityId && poolAssetAccountMetadata)) return
    ;(async () => {
      const _accountAssetAddress = await getThorchainFromAddress({
        accountId,
        assetId: poolAsset?.assetId,
        opportunityId,
        wallet,
        accountMetadata: poolAssetAccountMetadata,
        getPosition: getThorchainLpPosition,
      })
      setPoolAssetAccountAddress(_accountAssetAddress)
    })()
  }, [accountId, opportunityId, poolAsset, poolAssetAccountMetadata, wallet])

  const isDeposit = useMemo(() => isLpConfirmedDepositQuote(confirmedQuote), [confirmedQuote])
  const isSymWithdraw = useMemo(
    () => opportunityType === 'sym' && !isDeposit,
    [isDeposit, opportunityType],
  )
  const isSweepNeededArgs = useMemo(
    () => ({
      assetId: poolAsset?.assetId,
      address: poolAssetAccountAddress ?? null,
      amountCryptoBaseUnit: toBaseUnit(
        actualAssetWithdrawAmountCryptoPrecision ?? 0,
        poolAsset?.precision ?? 0,
      ),
      // Effectively defined at runtime because of the enabled check below
      txFeeCryptoBaseUnit: estimatedPoolAssetFeesData?.txFeeCryptoBaseUnit!,
      // Don't fetch sweep needed if there isn't enough balance for the tx + fees, since adding in a sweep Tx would obviously fail too
      // also, use that as balance checks instead of our current one, at least for the asset (not ROON)
      enabled: Boolean(
        // Symmetrical withdraws do not occur an asset Tx, only a RUNE Tx, hence will never occur a sweep step
        !isSymWithdraw &&
          !!poolAsset?.assetId &&
          bnOrZero(actualAssetWithdrawAmountCryptoPrecision).gt(0) &&
          estimatedPoolAssetFeesData?.txFeeCryptoBaseUnit,
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

    mixpanel?.track(MixPanelEvent.LpWithdrawPreview, confirmedQuote!)
    history.push(RemoveLiquidityRoutePaths.Confirm)
  }, [confirmedQuote, history, isSweepNeeded, mixpanel])

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
            isRune
              ? virtualRuneWithdrawAmountCryptoPrecision
              : virtualAssetWithdrawAmountCryptoPrecision,
          )
            .times(opportunityType === 'sym' ? 1 : 2)
            .toFixed()
          const fiatAmount = bnOrZero(
            isRune
              ? virtualRuneWithdrawAmountFiatUserCurrency
              : virtualAssetWithdrawAmountFiatUserCurrency,
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
    virtualRuneWithdrawAmountCryptoPrecision,
    virtualAssetWithdrawAmountCryptoPrecision,
    virtualRuneWithdrawAmountFiatUserCurrency,
    virtualAssetWithdrawAmountFiatUserCurrency,
    position,
    accountId,
    percentOptions,
    opportunityType,
  ])

  const divider = useMemo(() => <StackDivider borderColor='border.base' />, [])

  const walletSupportsRune = useMemo(() => {
    const chainId = thorchainChainId
    const walletSupport = walletSupportsChain({ chainId, wallet, isSnapInstalled })
    return walletSupport && runeAccountIds.length > 0
  }, [isSnapInstalled, runeAccountIds.length, wallet])

  const isUnsupportedSymWithdraw = useMemo(
    () => opportunityType === 'sym' && !walletSupportsRune,
    [opportunityType, walletSupportsRune],
  )

  const hasEnoughPoolAssetFeeAssetBalanceForTx = useMemo(() => {
    // only asym asset withdrawals result in an asset transaction
    if (opportunityType !== AsymSide.Asset) return true
    if (bnOrZero(actualAssetWithdrawAmountCryptoPrecision).isZero()) return true
    if (!poolAssetFeeAsset) return false

    const poolAssetFeeAssetBalanceCryptoPrecision = fromBaseUnit(
      poolAssetFeeAssetBalanceCryptoBaseUnit,
      poolAssetFeeAsset?.precision,
    )

    return bnOrZero(poolAssetTxFeeCryptoPrecision)
      .plus(poolAssetFeeAssetDustAmountCryptoPrecision)
      .lte(poolAssetFeeAssetBalanceCryptoPrecision)
  }, [
    actualAssetWithdrawAmountCryptoPrecision,
    opportunityType,
    poolAssetFeeAsset,
    poolAssetFeeAssetBalanceCryptoBaseUnit,
    poolAssetFeeAssetDustAmountCryptoPrecision,
    poolAssetTxFeeCryptoPrecision,
  ])

  const hasEnoughRuneBalanceForTx = useMemo(() => {
    // only sym and asym rune withdrawals result in a rune transaction
    if (opportunityType === AsymSide.Asset) return true
    if (bnOrZero(actualRuneWithdrawAmountCryptoPrecision).isZero()) return true
    if (!runeAsset) return false

    const runeBalanceCryptoPrecision = fromBaseUnit(runeBalanceCryptoBaseUnit, runeAsset?.precision)

    return bnOrZero(runeTxFeeCryptoPrecision)
      .plus(runeDustAmountCryptoPrecision)
      .lte(runeBalanceCryptoPrecision)
  }, [
    actualRuneWithdrawAmountCryptoPrecision,
    opportunityType,
    runeAsset,
    runeBalanceCryptoBaseUnit,
    runeDustAmountCryptoPrecision,
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
    if (isUnsupportedSymWithdraw) return translate('common.unsupportedNetwork')
    if (isTradingActive === false) return translate('common.poolHalted')
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
    isTradingActive,
    isUnsupportedSymWithdraw,
    poolAssetFeeAsset,
    runeAsset,
    translate,
  ])

  const maybeOpportunityNotSupportedExplainer = useMemo(() => {
    if (!poolAsset || !runeAsset) return null
    if (!isUnsupportedSymWithdraw) return null

    return (
      <Alert status='error' mx={-2} width='auto'>
        <AlertIcon />
        <AlertDescription fontSize='sm' fontWeight='medium'>
          {translate('pools.unsupportedNetworkExplainer', { network: runeAsset.networkName })}
        </AlertDescription>
      </Alert>
    )
  }, [isUnsupportedSymWithdraw, poolAsset, runeAsset, translate])

  const confirmCopy = useMemo(() => {
    if (errorCopy) return errorCopy
    return translate('pools.removeLiquidity')
  }, [errorCopy, translate])

  if (!poolAsset || !poolAssetFeeAsset || !runeAsset) return null

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
              <Amount.Fiat value={slippageFiatUserCurrency ?? ''} />
            </Skeleton>
          </Row.Value>
        </Row>
        <Row fontSize='sm' fontWeight='medium'>
          <Row.Label>{translate('common.gasFee')}</Row.Label>
          <Row.Value>
            <Skeleton
              isLoaded={
                (!isEstimatedPoolAssetFeesDataLoading || opportunityType === AsymSide.Rune) &&
                (!isEstimatedRuneFeesDataLoading || opportunityType === AsymSide.Asset)
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
        {isBelowMinimumWithdrawAmount && (
          <Alert status='warning' mx={-2} width='auto'>
            <AlertIcon />
            <AlertDescription fontSize='sm' fontWeight='medium'>
              {translate('defi.modals.saversVaults.dangerousWithdrawWarning')}
            </AlertDescription>
          </Alert>
        )}
        {maybeOpportunityNotSupportedExplainer}
        <Button
          mx={-2}
          size='lg'
          colorScheme={errorCopy ? 'red' : 'blue'}
          onClick={handleSubmit}
          isDisabled={
            isUnsupportedSymWithdraw ||
            isTradingActive === false ||
            !hasEnoughPoolAssetFeeAssetBalanceForTx ||
            !hasEnoughRuneBalanceForTx ||
            !confirmedQuote ||
            (isEstimatedPoolAssetFeesDataError && opportunityType !== AsymSide.Rune) ||
            (isEstimatedRuneFeesDataError && opportunityType !== AsymSide.Asset) ||
            !validInputAmount ||
            isSweepNeededLoading ||
            isBelowMinimumWithdrawAmount
          }
          isLoading={
            isTradingActiveLoading ||
            (isEstimatedPoolAssetFeesDataLoading && opportunityType !== AsymSide.Rune) ||
            (isEstimatedRuneFeesDataLoading && opportunityType !== AsymSide.Asset) ||
            isSweepNeededLoading
          }
        >
          {confirmCopy}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
