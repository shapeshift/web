import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  CardFooter,
  CardHeader,
  Center,
  Collapse,
  Divider,
  Flex,
  FormLabel,
  IconButton,
  Skeleton,
  Stack,
  StackDivider,
} from '@chakra-ui/react'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId, thorchainAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import type { Asset, KnownChainIds, MarketData } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BiSolidBoltCircle } from 'react-icons/bi'
import { FaPlus } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { TradeAssetSelect } from 'components/MultiHopTrade/components/AssetSelection'
import { SlippagePopover } from 'components/MultiHopTrade/components/SlippagePopover'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import { calculateFees } from 'lib/fees/model'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { isSome, isToken } from 'lib/utils'
import { getSupportedEvmChainIds } from 'lib/utils/evm'
import { THOR_PRECISION } from 'lib/utils/thorchain/constants'
import { estimateAddThorchainLiquidityPosition } from 'lib/utils/thorchain/lp'
import { AsymSide, type ConfirmedQuote } from 'lib/utils/thorchain/lp/types'
import { usePools } from 'pages/ThorChainLP/queries/hooks/usePools'
import { selectIsSnapshotApiQueriesPending, selectVotingPower } from 'state/apis/snapshot/selectors'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectAssets,
  selectMarketDataById,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import { LpType } from '../LpType'
import { ReadOnlyAsset } from '../ReadOnlyAsset'
import { PoolSummary } from './components/PoolSummary'
import { AddLiquidityRoutePaths } from './types'

const buttonProps = { flex: 1, justifyContent: 'space-between' }

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

export type AddLiquidityInputProps = {
  headerComponent?: JSX.Element
  opportunityId?: string
  paramOpportunityId?: string
  setConfirmedQuote: (quote: ConfirmedQuote) => void
  confirmedQuote: ConfirmedQuote | null
  accountIdsByChainId: Record<ChainId, AccountId>
  onAccountIdChange: (accountId: AccountId, assetId: AssetId) => void
}

export const AddLiquidityInput: React.FC<AddLiquidityInputProps> = ({
  headerComponent,
  opportunityId,
  paramOpportunityId,
  confirmedQuote,
  setConfirmedQuote,
  accountIdsByChainId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const wallet = useWallet().state.wallet
  const queryClient = useQueryClient()
  const translate = useTranslate()
  const { history: browserHistory } = useBrowserRouter()
  const history = useHistory()
  const divider = useMemo(() => <StackDivider borderColor='border.base' />, [])

  const votingPower = useAppSelector(selectVotingPower)
  const isSnapshotApiQueriesPending = useAppSelector(selectIsSnapshotApiQueriesPending)
  const isVotingPowerLoading = useMemo(
    () => isSnapshotApiQueriesPending && votingPower === undefined,
    [isSnapshotApiQueriesPending, votingPower],
  )

  const { data: parsedPools } = usePools()

  const assets = useAppSelector(selectAssets)
  const poolAssets = useMemo(() => {
    if (!parsedPools) return []

    return [...new Set(parsedPools.map(pool => assets[pool.assetId]).filter(isSome))]
  }, [assets, parsedPools])

  // TODO(gomes): Even though that's an edge case for users, and a bad practice, handling sym and asymm positions simultaneously
  // *is* possible and *is* something that both we and TS do. We can do one better than TS here however:
  // - When a user deposits symetrically, they can then deposit asymetrically, but only on the asset side
  // - When a user deposits asymetrically, no matter the side, they *can* deposit symetrically on the other side
  //   - They can also deposit asymetrically after that, but with one caveat: they can do so only if they deposited asym on the *asset* side only
  //     In other words, if they have an active asym. RUNE position, they can't deposit symetrically after that unless they withdraw
  //     The reason for that is that the RUNE side memo performs a nameservice operation, registering the asset address (or a placeholder)
  //
  //     We should handle this in the UI and block users from deposits that *will* fail, by detecting their current position(s)
  //     and not allowing them to select the sure-to-fail deposit types
  const defaultOpportunityId = useMemo(() => {
    if (!parsedPools) return undefined
    if (opportunityId) return undefined
    if (paramOpportunityId) return paramOpportunityId

    const firstAsymOpportunityId = parsedPools.find(pool => pool.asymSide === null)?.opportunityId

    return firstAsymOpportunityId
  }, [parsedPools, opportunityId, paramOpportunityId])

  const [activeOpportunityId, setActiveOpportunityId] = useState(
    opportunityId ?? defaultOpportunityId,
  )

  useEffect(() => {
    if (!(opportunityId || defaultOpportunityId)) return

    setActiveOpportunityId(opportunityId ?? defaultOpportunityId)
  }, [defaultOpportunityId, opportunityId])

  const foundPool = useMemo(() => {
    if (!parsedPools) return undefined
    return parsedPools.find(pool => pool.opportunityId === activeOpportunityId)
  }, [activeOpportunityId, parsedPools])

  const isAsym = useMemo(() => foundPool?.isAsymmetric, [foundPool?.isAsymmetric])
  const isAsymAssetSide = useMemo(
    () => foundPool?.asymSide === AsymSide.Asset,
    [foundPool?.asymSide],
  )
  const isAsymRuneSide = useMemo(() => foundPool?.asymSide === AsymSide.Rune, [foundPool?.asymSide])

  const _asset = useAppSelector(state => selectAssetById(state, foundPool?.assetId ?? ''))
  useEffect(() => {
    if (!_asset) return
    setAsset(_asset)
  }, [_asset])

  const rune = useAppSelector(state => selectAssetById(state, thorchainAssetId))

  const [asset, setAsset] = useState<Asset | undefined>(_asset)

  useEffect(() => {
    if (!(asset && parsedPools)) return
    // We only want to run this effect in the standalone AddLiquidity page
    if (!defaultOpportunityId) return

    const foundOpportunityId = (parsedPools ?? []).find(
      pool => pool.assetId === asset.assetId && pool.asymSide === null,
    )?.opportunityId
    if (!foundOpportunityId) return
    setActiveOpportunityId(foundOpportunityId)
  }, [asset, defaultOpportunityId, parsedPools])

  const handleAssetChange = useCallback((asset: Asset) => {
    console.info(asset)
  }, [])

  const handleBackClick = useCallback(() => {
    browserHistory.push('/pools')
  }, [browserHistory])

  const percentOptions = useMemo(() => [1], [])

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
          disabled={!confirmedQuote}
        />
        {translate('pools.addLiquidity')}
        <SlippagePopover />
      </CardHeader>
    )
  }, [backIcon, confirmedQuote, handleBackClick, headerComponent, translate])

  const assetMarketData = useAppSelector(state => selectMarketDataById(state, asset?.assetId ?? ''))
  const runeMarketData = useAppSelector(state => selectMarketDataById(state, rune?.assetId ?? ''))

  // Virtual as in, these are the amounts if depositing symetrically. But a user may deposit asymetrically, so these are not the *actual* amounts
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

  const [slippageRune, setSlippageRune] = useState<string | undefined>()
  const [shareOfPoolDecimalPercent, setShareOfPoolDecimalPercent] = useState<string | undefined>()

  const assetBalanceFilter = useMemo(
    () => ({
      assetId: asset?.assetId,
      accountId: accountIdsByChainId[asset?.assetId ? fromAssetId(asset?.assetId).chainId : ''],
    }),
    [asset, accountIdsByChainId],
  )

  const assetBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, assetBalanceFilter),
  )
  const hasEnoughAssetBalance = useMemo(() => {
    const assetBalanceCryptoPrecision = fromBaseUnit(
      assetBalanceCryptoBaseUnit,
      asset?.precision ?? 0,
    )
    return bnOrZero(actualAssetCryptoLiquidityAmount).lte(assetBalanceCryptoPrecision)
  }, [assetBalanceCryptoBaseUnit, asset?.precision, actualAssetCryptoLiquidityAmount])

  const { data: inboundAddressData, isLoading: isInboundAddressLoading } = useQuery({
    ...reactQueries.thornode.inboundAddress(asset?.assetId),
    enabled: (() => {
      if (!asset) return false
      if (!isToken(fromAssetId(asset.assetId).assetReference)) return false
      const supportedEvmChainIds = getSupportedEvmChainIds()
      if (!supportedEvmChainIds.includes(fromAssetId(asset.assetId).chainId as KnownChainIds))
        return false
      // We don't need to fetch this in case there is no asset input amount
      if (bnOrZero(actualAssetCryptoLiquidityAmount).isZero()) return false
      return true
    })(),
    select: data => data?.unwrap(),
  })

  const assetAccountNumberFilter = useMemo(() => {
    const poolAccountId =
      accountIdsByChainId[foundPool?.assetId ? fromAssetId(foundPool.assetId).chainId : '']

    return { assetId: asset?.assetId ?? '', accountId: poolAccountId ?? '' }
  }, [accountIdsByChainId, foundPool?.assetId, asset?.assetId])

  const assetAccountNumber = useAppSelector(s =>
    selectAccountNumberByAccountId(s, assetAccountNumberFilter),
  )
  const allowanceFromAddress = useMemo(() => {
    if (!asset) return
    if (!isToken(fromAssetId(asset.assetId).assetReference)) return
    const poolAccountId =
      accountIdsByChainId[foundPool?.assetId ? fromAssetId(foundPool.assetId).chainId : '']
    if (!poolAccountId) return
    const supportedEvmChainIds = getSupportedEvmChainIds()
    if (!supportedEvmChainIds.includes(fromAssetId(asset.assetId).chainId as KnownChainIds)) return

    return fromAccountId(poolAccountId).account
  }, [accountIdsByChainId, asset, foundPool?.assetId])

  const [approvalTxId, setApprovalTxId] = useState<string | null>(null)
  const serializedTxIndex = useMemo(() => {
    const poolAccountId =
      accountIdsByChainId[foundPool?.assetId ? fromAssetId(foundPool.assetId).chainId : '']
    if (!(approvalTxId && allowanceFromAddress && poolAccountId)) return ''
    return serializeTxIndex(poolAccountId, approvalTxId, allowanceFromAddress)
  }, [accountIdsByChainId, foundPool?.assetId, approvalTxId, allowanceFromAddress])

  // @ts-ignore this is wrongly typed
  const {
    mutate,
    isPending: isApprovalMutationPending,
    isSuccess: isApprovalMutationSuccess,
  } = useMutation({
    ...reactQueries.mutations.approve({
      assetId: asset?.assetId,
      spender: inboundAddressData?.router,
      from: allowanceFromAddress,
      amount: toBaseUnit(actualAssetCryptoLiquidityAmount, asset?.precision ?? 0),
      wallet,
      accountNumber: assetAccountNumber,
    }),
    onSuccess: (txId: string) => {
      setApprovalTxId(txId)
    },
  })

  const approvalTx = useAppSelector(gs => selectTxById(gs, serializedTxIndex))
  const isApprovalTxPending = useMemo(
    () =>
      isApprovalMutationPending ||
      (isApprovalMutationSuccess && approvalTx?.status !== TxStatus.Confirmed),
    [approvalTx?.status, isApprovalMutationPending, isApprovalMutationSuccess],
  )

  useEffect(() => {
    if (!approvalTx) return
    if (isApprovalTxPending) return
    ;(async () => {
      await queryClient.invalidateQueries(
        reactQueries.common.allowanceCryptoBaseUnit(
          asset?.assetId,
          inboundAddressData?.router,
          allowanceFromAddress,
        ),
      )
    })()
  }, [
    allowanceFromAddress,
    approvalTx,
    asset?.assetId,
    inboundAddressData?.router,
    isApprovalTxPending,
    queryClient,
  ])

  const { data: allowanceData, isLoading: isAllowanceDataLoading } = useQuery({
    refetchInterval: 30_000,
    ...reactQueries.common.allowanceCryptoBaseUnit(
      asset?.assetId,
      inboundAddressData?.router,
      allowanceFromAddress,
    ),
  })

  const isApprovalRequired = useMemo(() => {
    if (!confirmedQuote) return false
    if (!asset) return false
    if (!isToken(fromAssetId(asset.assetId).assetReference)) return false
    const supportedEvmChainIds = getSupportedEvmChainIds()
    if (!supportedEvmChainIds.includes(fromAssetId(asset.assetId).chainId as KnownChainIds))
      return false

    const allowanceCryptoPrecision = fromBaseUnit(allowanceData ?? '0', asset.precision)
    return bnOrZero(actualAssetCryptoLiquidityAmount).gt(allowanceCryptoPrecision)
  }, [actualAssetCryptoLiquidityAmount, allowanceData, asset, confirmedQuote])

  const handleApprove = useCallback(() => mutate(undefined), [mutate])
  const handleSubmit = useCallback(() => {
    if (isApprovalRequired) {
      handleApprove()
      return
    }
    history.push(AddLiquidityRoutePaths.Confirm)
  }, [handleApprove, history, isApprovalRequired])

  const runeBalanceFilter = useMemo(
    () => ({
      assetId: rune?.assetId,
      accountId: accountIdsByChainId[thorchainChainId],
    }),
    [rune, accountIdsByChainId],
  )

  const runeBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, runeBalanceFilter),
  )

  const hasEnoughRuneBalance = useMemo(() => {
    const runeBalanceCryptoPrecision = fromBaseUnit(runeBalanceCryptoBaseUnit, rune?.precision ?? 0)
    return bnOrZero(actualRuneCryptoLiquidityAmount).lte(runeBalanceCryptoPrecision)
  }, [runeBalanceCryptoBaseUnit, rune?.precision, actualRuneCryptoLiquidityAmount])

  const runePerAsset = useMemo(() => {
    if (!assetMarketData || !runeMarketData) return undefined
    return bn(assetMarketData.price).div(bn(runeMarketData.price)).toFixed()
  }, [assetMarketData, runeMarketData])

  const createHandleAddLiquidityInputChange = useCallback(
    (marketData: MarketData, isRune: boolean) => {
      return (value: string, isFiat?: boolean) => {
        if (!asset || !marketData) return undefined
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
          setVirtualAssetCryptoLiquidityAmount(bn(crypto).div(bnOrZero(runePerAsset)).toFixed())
        } else if (!isRune && bnOrZero(runePerAsset).isGreaterThan(0)) {
          setVirtualAssetCryptoLiquidityAmount(crypto)
          setVirtualAssetFiatLiquidityAmount(fiat)
          setVirtualRuneFiatLiquidityAmount(fiat)
          setVirtualRuneCryptoLiquidityAmount(bn(crypto).times(bnOrZero(runePerAsset)).toFixed())
        }
      }
    },
    [asset, runePerAsset],
  )

  useEffect(() => {
    ;(async () => {
      if (!actualRuneCryptoLiquidityAmount || !actualAssetCryptoLiquidityAmount || !asset) return

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

      const estimate = await estimateAddThorchainLiquidityPosition({
        runeAmountCryptoThorPrecision,
        assetAmountCryptoThorPrecision,
        assetId: asset.assetId,
      })

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
    asset,
    foundPool?.asymSide,
    foundPool?.isAsymmetric,
    isAsym,
    isAsymAssetSide,
    isAsymRuneSide,
    virtualRuneFiatLiquidityAmount,
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
        activeOpportunityId
      )
    )
      return

    const totalAmountFiat = bnOrZero(actualAssetFiatLiquidityAmount)
      .times(isAsym ? 1 : 2)
      .toFixed()

    const { feeBps, feeUsd } = calculateFees({
      tradeAmountUsd: bn(totalAmountFiat),
      foxHeld: votingPower !== undefined ? bn(votingPower) : undefined,
    })

    setConfirmedQuote({
      assetCryptoLiquidityAmount: actualAssetCryptoLiquidityAmount,
      assetFiatLiquidityAmount: actualAssetFiatLiquidityAmount,
      runeCryptoLiquidityAmount: actualRuneCryptoLiquidityAmount,
      runeFiatLiquidityAmount: actualRuneFiatLiquidityAmount,
      shareOfPoolDecimalPercent,
      slippageRune,
      opportunityId: activeOpportunityId,
      accountIdsByChainId,
      totalAmountFiat,
      feeBps: feeBps.toFixed(0),
      feeAmountFiat: feeUsd.toFixed(2),
    })
  }, [
    accountIdsByChainId,
    activeOpportunityId,
    actualAssetCryptoLiquidityAmount,
    actualAssetFiatLiquidityAmount,
    actualRuneCryptoLiquidityAmount,
    actualRuneFiatLiquidityAmount,
    isAsym,
    setConfirmedQuote,
    shareOfPoolDecimalPercent,
    slippageRune,
    votingPower,
  ])

  const tradeAssetInputs = useMemo(() => {
    if (!(asset && rune && foundPool)) return null

    const assets: Asset[] = (() => {
      if (foundPool.asymSide === null) return [asset, rune]
      if (foundPool.asymSide === AsymSide.Rune) return [rune]
      if (foundPool.asymSide === AsymSide.Asset) return [asset]

      throw new Error('Invalid asym side')
    })()

    return (
      <Stack divider={pairDivider} spacing={0}>
        {assets.map(_asset => {
          const isRune = _asset.assetId === rune.assetId
          const marketData = isRune ? runeMarketData : assetMarketData
          const handleAddLiquidityInputChange = createHandleAddLiquidityInputChange(
            marketData,
            isRune,
          )
          const cryptoAmount = isRune
            ? virtualRuneCryptoLiquidityAmount
            : virtualAssetCryptoLiquidityAmount
          const fiatAmount = isRune
            ? virtualRuneFiatLiquidityAmount
            : virtualAssetFiatLiquidityAmount

          return (
            <TradeAssetInput
              assetId={_asset?.assetId}
              assetIcon={_asset?.icon ?? ''}
              assetSymbol={_asset?.symbol ?? ''}
              // eslint-disable-next-line react-memo/require-usememo
              onAccountIdChange={(accountId: AccountId) => {
                handleAccountIdChange(accountId, _asset?.assetId)
              }}
              percentOptions={percentOptions}
              rightComponent={ReadOnlyAsset}
              formControlProps={formControlProps}
              onChange={handleAddLiquidityInputChange}
              cryptoAmount={cryptoAmount}
              fiatAmount={fiatAmount}
            />
          )
        })}
      </Stack>
    )
  }, [
    asset,
    assetMarketData,
    createHandleAddLiquidityInputChange,
    foundPool,
    handleAccountIdChange,
    pairDivider,
    percentOptions,
    rune,
    runeMarketData,
    virtualAssetCryptoLiquidityAmount,
    virtualAssetFiatLiquidityAmount,
    virtualRuneCryptoLiquidityAmount,
    virtualRuneFiatLiquidityAmount,
  ])

  const symAlert = useMemo(() => {
    if (!(foundPool && rune && asset)) return null
    if (!foundPool.asymSide) return null

    const from = foundPool.asymSide === AsymSide.Rune ? rune.symbol : asset?.symbol
    const to = foundPool.asymSide === AsymSide.Rune ? asset?.symbol : rune.symbol

    return (
      <Alert status='info' mx={-2} width='auto'>
        <AlertIcon as={BiSolidBoltCircle} />
        <AlertDescription fontSize='sm' fontWeight='medium'>
          {translate('pools.symAlert', { from, to })}
        </AlertDescription>
      </Alert>
    )
  }, [asset, foundPool, rune, translate])

  const buyAssetSearch = useModal('buyAssetSearch')
  const handlePoolAssetClick = useCallback(() => {
    buyAssetSearch.open({
      onClick: setAsset,
      title: 'pools.pool',
      assets: poolAssets,
    })
  }, [buyAssetSearch, poolAssets])

  const pairSelect = useMemo(() => {
    // We only want to show the pair select on standalone "Add Liquidity" - not on the pool page
    if (!defaultOpportunityId) return null
    return (
      <Stack>
        <FormLabel px={6} mb={0} fontSize='sm'>
          {translate('pools.selectPair')}
        </FormLabel>
        <TradeAssetSelect
          assetId={asset?.assetId}
          onAssetClick={handlePoolAssetClick}
          onAssetChange={handleAssetChange}
          isLoading={false}
          mb={0}
          buttonProps={buttonProps}
        />
        <TradeAssetSelect
          assetId={thorchainAssetId}
          onAssetChange={handleAssetChange}
          isLoading={false}
          mb={0}
          buttonProps={buttonProps}
        />
      </Stack>
    )
  }, [asset?.assetId, defaultOpportunityId, handleAssetChange, handlePoolAssetClick, translate])

  const handleAsymSideChange = useCallback(
    (asymSide: string | null) => {
      if (!(parsedPools && asset)) return

      // The null option gets casted as an empty string by the radio component so we cast it back to null
      const parsedAsymSide = (asymSide as AsymSide | '') || null
      const assetPools = parsedPools.filter(pool => pool.assetId === asset.assetId)
      const foundPool = assetPools.find(pool => pool.asymSide === parsedAsymSide)
      if (!foundPool) return

      setActiveOpportunityId(foundPool.opportunityId)
    },
    [asset, parsedPools],
  )

  const confirmCopy = useMemo(() => {
    if (isApprovalRequired)
      return translate(`transactionRow.parser.erc20.approveSymbol`, { symbol: asset?.symbol ?? '' })

    return translate('pools.addLiquidity')
  }, [asset?.symbol, isApprovalRequired, translate])

  if (!foundPool || !asset || !rune) return null

  return (
    <SlideTransition>
      {renderHeader}
      <Stack divider={divider} spacing={4} pb={4}>
        {pairSelect}
        <Stack>
          <FormLabel mb={0} px={6} fontSize='sm'>
            {translate('pools.depositAmounts')}
          </FormLabel>
          <LpType
            assetId={asset.assetId}
            defaultOpportunityId={defaultOpportunityId}
            onAsymSideChange={handleAsymSideChange}
          />
          {tradeAssetInputs}
        </Stack>
        <Collapse in={true}>
          <PoolSummary
            assetId={asset.assetId}
            runePerAsset={runePerAsset}
            shareOfPoolDecimalPercent={shareOfPoolDecimalPercent}
          />
        </Collapse>
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
            <Skeleton isLoaded={true}>
              <Amount.Crypto value={slippageRune ?? 'TODO - loading'} symbol={rune.symbol} />
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
              <Amount.Fiat value={confirmedQuote?.feeAmountFiat ?? '0'} />
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
        {symAlert}
        <Button
          mx={-2}
          size='lg'
          colorScheme='blue'
          isDisabled={
            !confirmedQuote ||
            isVotingPowerLoading ||
            !hasEnoughAssetBalance ||
            !hasEnoughRuneBalance ||
            isApprovalTxPending
          }
          isLoading={
            isVotingPowerLoading ||
            isInboundAddressLoading ||
            isAllowanceDataLoading ||
            isApprovalTxPending
          }
          onClick={handleSubmit}
        >
          {confirmCopy}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
