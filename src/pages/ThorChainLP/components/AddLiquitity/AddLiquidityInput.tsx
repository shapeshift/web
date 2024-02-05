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
import { fromAssetId, thorchainAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import type { Asset, KnownChainIds, MarketData } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BiSolidBoltCircle } from 'react-icons/bi'
import { FaPlus } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useQuoteEstimatedFeesQuery } from 'react-queries/hooks/useQuoteEstimatedFeesQuery'
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
import { assertUnreachable, isSome, isToken } from 'lib/utils'
import { getSupportedEvmChainIds } from 'lib/utils/evm'
import { getThorchainFromAddress } from 'lib/utils/thorchain'
import { THOR_PRECISION, THORCHAIN_POOL_MODULE_ADDRESS } from 'lib/utils/thorchain/constants'
import {
  estimateAddThorchainLiquidityPosition,
  getThorchainLpTransactionType,
} from 'lib/utils/thorchain/lp'
import { AsymSide, type LpConfirmedDepositQuote } from 'lib/utils/thorchain/lp/types'
import { useIsSweepNeededQuery } from 'pages/Lending/hooks/useIsSweepNeededQuery'
import { usePools } from 'pages/ThorChainLP/queries/hooks/usePools'
import { getThorchainLpPosition } from 'pages/ThorChainLP/queries/queries'
import { selectIsSnapshotApiQueriesPending, selectVotingPower } from 'state/apis/snapshot/selectors'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectAssets,
  selectFeeAssetById,
  selectMarketDataById,
  selectPortfolioAccountMetadataByAccountId,
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
  setConfirmedQuote: (quote: LpConfirmedDepositQuote) => void
  confirmedQuote: LpConfirmedDepositQuote | null
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

  const [poolAssetAccountAddress, setPoolAssetAccountAddress] = useState<string | undefined>(
    undefined,
  )
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
  const [isSlippageLoading, setIsSlippageLoading] = useState(false)
  const [shareOfPoolDecimalPercent, setShareOfPoolDecimalPercent] = useState<string | undefined>()

  const assetBalanceFilter = useMemo(
    () => ({
      assetId: asset?.assetId,
      accountId: accountIdsByChainId[asset?.assetId ? fromAssetId(asset?.assetId).chainId : ''],
    }),
    [asset, accountIdsByChainId],
  )

  const poolAssetBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, assetBalanceFilter),
  )
  const poolAssetFeeAsset = useAppSelector(state => selectFeeAssetById(state, asset?.assetId ?? ''))
  const poolAssetFeeAssetBalanceFilter = useMemo(
    () => ({
      assetId: poolAssetFeeAsset?.assetId,
      accountId:
        poolAssetFeeAsset?.assetId &&
        accountIdsByChainId[fromAssetId(poolAssetFeeAsset.assetId).chainId],
    }),
    [poolAssetFeeAsset, accountIdsByChainId],
  )
  const poolAssetFeeAssetBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, poolAssetFeeAssetBalanceFilter),
  )

  const hasEnoughAssetBalance = useMemo(() => {
    const assetBalanceCryptoPrecision = fromBaseUnit(
      poolAssetBalanceCryptoBaseUnit,
      asset?.precision ?? 0,
    )
    return bnOrZero(actualAssetCryptoLiquidityAmount).lte(assetBalanceCryptoPrecision)
  }, [poolAssetBalanceCryptoBaseUnit, asset?.precision, actualAssetCryptoLiquidityAmount])

  const { data: inboundAddressData, isLoading: isInboundAddressLoading } = useQuery({
    ...reactQueries.thornode.inboundAddress(asset?.assetId),
    enabled: !!asset,
    select: data => data?.unwrap(),
  })

  const poolAccountId = useMemo(
    () => accountIdsByChainId[foundPool?.assetId ? fromAssetId(foundPool.assetId).chainId : ''],
    [accountIdsByChainId, foundPool?.assetId],
  )

  const poolAccountMetadataFilter = useMemo(() => ({ accountId: poolAccountId }), [poolAccountId])
  const poolAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, poolAccountMetadataFilter),
  )

  const assetAccountNumberFilter = useMemo(() => {
    return { assetId: asset?.assetId ?? '', accountId: poolAccountId ?? '' }
  }, [asset?.assetId, poolAccountId])

  const assetAccountNumber = useAppSelector(s =>
    selectAccountNumberByAccountId(s, assetAccountNumberFilter),
  )
  const [approvalTxId, setApprovalTxId] = useState<string | null>(null)
  const serializedApprovalTxIndex = useMemo(() => {
    if (!(approvalTxId && poolAssetAccountAddress && poolAccountId)) return ''
    return serializeTxIndex(poolAccountId, approvalTxId, poolAssetAccountAddress)
  }, [approvalTxId, poolAssetAccountAddress, poolAccountId])

  const {
    mutate,
    isPending: isApprovalMutationPending,
    isSuccess: isApprovalMutationSuccess,
  } = useMutation({
    ...reactQueries.mutations.approve({
      assetId: asset?.assetId,
      spender: inboundAddressData?.router,
      from: poolAssetAccountAddress,
      amount: toBaseUnit(actualAssetCryptoLiquidityAmount, asset?.precision ?? 0),
      wallet,
      accountNumber: assetAccountNumber,
    }),
    onSuccess: (txId: string) => {
      setApprovalTxId(txId)
    },
  })

  const approvalTx = useAppSelector(gs => selectTxById(gs, serializedApprovalTxIndex))
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
          poolAssetAccountAddress,
        ),
      )
    })()
  }, [
    approvalTx,
    asset?.assetId,
    inboundAddressData?.router,
    isApprovalTxPending,
    poolAssetAccountAddress,
    queryClient,
  ])

  const { data: allowanceData, isLoading: isAllowanceDataLoading } = useQuery({
    refetchInterval: 30_000,
    ...reactQueries.common.allowanceCryptoBaseUnit(
      asset?.assetId,
      inboundAddressData?.router,
      poolAssetAccountAddress,
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

  useEffect(() => {
    if (!(wallet && asset && activeOpportunityId && poolAccountMetadata)) return
    const accountId = poolAccountId
    const assetId = asset?.assetId

    if (!assetId) return
    ;(async () => {
      const _accountAssetAddress = await getThorchainFromAddress({
        accountId,
        assetId,
        opportunityId: activeOpportunityId,
        wallet,
        accountMetadata: poolAccountMetadata,
        getPosition: getThorchainLpPosition,
      })
      setPoolAssetAccountAddress(_accountAssetAddress)
    })()
  }, [activeOpportunityId, asset, poolAccountId, poolAccountMetadata, wallet])

  const poolAssetInboundAddress = useMemo(() => {
    if (!asset) return
    const transactionType = getThorchainLpTransactionType(asset.chainId)

    switch (transactionType) {
      case 'MsgDeposit': {
        return THORCHAIN_POOL_MODULE_ADDRESS
      }
      case 'EvmCustomTx': {
        // TODO: this should really be inboundAddressData?.router, but useQuoteEstimatedFeesQuery doesn't yet handle contract calls
        // for the purpose of naively assuming a send, using the inbound address instead of the router is fine
        return inboundAddressData?.address
      }
      case 'Send': {
        return inboundAddressData?.address
      }
      default: {
        assertUnreachable(transactionType as never)
      }
    }
  }, [asset, inboundAddressData?.address])

  // We reuse lending utils here since all this does is estimating fees for a given deposit amount with a memo
  // It's not going to be 100% accurate for EVM chains as it doesn't calculate the cost of depositWithExpiry, but rather a simple send,
  // however that's fine for now until accurate fees estimation is implemented
  const {
    data: estimatedPoolAssetFeesData,
    isLoading: isEstimatedPoolAssetFeesDataLoading,
    isError: isEstimatedPoolAssetFeesDataError,
    isSuccess: isEstimatedPoolAssetFeesDataSuccess,
  } = useQuoteEstimatedFeesQuery({
    collateralAssetId: asset?.assetId ?? '',
    collateralAccountId: poolAccountId,
    depositAmountCryptoPrecision: actualAssetCryptoLiquidityAmount ?? '0',
    confirmedQuote,
  })

  // Checks if there's enough pool asset balance for the transaction, excluding fees
  const hasEnoughPoolAssetBalanceForTx = useMemo(() => {
    if (!asset) return false

    const amountAvailableCryptoPrecision = fromBaseUnit(
      poolAssetBalanceCryptoBaseUnit,
      asset.precision ?? 0,
    )

    return bnOrZero(actualAssetCryptoLiquidityAmount).lte(amountAvailableCryptoPrecision)
  }, [actualAssetCryptoLiquidityAmount, asset, poolAssetBalanceCryptoBaseUnit])

  // Checks if there's enough fee asset balance to cover the transaction fees
  const hasEnoughFeeAssetBalanceForTx = useMemo(() => {
    if (!isEstimatedPoolAssetFeesDataSuccess || !asset) return false

    const txFeeCryptoPrecision = fromBaseUnit(
      estimatedPoolAssetFeesData.txFeeCryptoBaseUnit,
      asset.precision ?? 0,
    )

    // If the asset is not a token, assume it's a native asset and fees are taken from the same asset balance
    if (!isToken(fromAssetId(asset.assetId).assetReference)) {
      return bnOrZero(txFeeCryptoPrecision).lte(poolAssetBalanceCryptoBaseUnit)
    }

    // For tokens, check if the fee asset balance is enough to cover the fees
    return bnOrZero(txFeeCryptoPrecision).lte(poolAssetFeeAssetBalanceCryptoBaseUnit)
  }, [
    asset,
    estimatedPoolAssetFeesData?.txFeeCryptoBaseUnit,
    isEstimatedPoolAssetFeesDataSuccess,
    poolAssetBalanceCryptoBaseUnit,
    poolAssetFeeAssetBalanceCryptoBaseUnit,
  ])

  // Combines the checks for pool asset balance and fee asset balance to ensure both are sufficient
  const hasEnoughPoolAssetBalanceForTxPlusFees = useMemo(() => {
    return hasEnoughPoolAssetBalanceForTx && hasEnoughFeeAssetBalanceForTx
  }, [hasEnoughPoolAssetBalanceForTx, hasEnoughFeeAssetBalanceForTx])

  console.log({ hasEnoughFeeAssetBalanceForTx, hasEnoughPoolAssetBalanceForTx })

  const isSweepNeededArgs = useMemo(
    () => ({
      assetId: asset?.assetId,
      address: poolAssetAccountAddress ?? null,
      amountCryptoBaseUnit: toBaseUnit(
        actualAssetCryptoLiquidityAmount ?? 0,
        asset?.precision ?? 0,
      ),
      // Effectively defined at runtime because of the enabled check below
      txFeeCryptoBaseUnit: estimatedPoolAssetFeesData?.txFeeCryptoBaseUnit!,
      // Don't fetch sweep needed if there isn't enough balance for the tx + fees, since adding in a sweep Tx would obviously fail too
      // also, use that as balance checks instead of our current one, at least for the asset (not ROON)
      enabled: Boolean(
        !!asset?.assetId &&
          bnOrZero(actualAssetCryptoLiquidityAmount).gt(0) &&
          isEstimatedPoolAssetFeesDataSuccess &&
          hasEnoughPoolAssetBalanceForTxPlusFees &&
          estimatedPoolAssetFeesData?.txFeeCryptoBaseUnit,
      ),
    }),
    [
      poolAssetAccountAddress,
      actualAssetCryptoLiquidityAmount,
      asset?.assetId,
      asset?.precision,
      estimatedPoolAssetFeesData,
      hasEnoughPoolAssetBalanceForTxPlusFees,
      isEstimatedPoolAssetFeesDataSuccess,
    ],
  )

  const { data: isSweepNeeded, isLoading: isSweepNeededLoading } =
    useIsSweepNeededQuery(isSweepNeededArgs)

  const handleApprove = useCallback(() => mutate(undefined), [mutate])

  const handleSubmit = useCallback(() => {
    if (isApprovalRequired) {
      handleApprove()
      return
    }
    history.push(isSweepNeeded ? AddLiquidityRoutePaths.Sweep : AddLiquidityRoutePaths.Confirm)
  }, [handleApprove, history, isApprovalRequired, isSweepNeeded])

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

      setIsSlippageLoading(true)

      const estimate = await estimateAddThorchainLiquidityPosition({
        runeAmountCryptoThorPrecision,
        assetAmountCryptoThorPrecision,
        assetId: asset.assetId,
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
        activeOpportunityId &&
        poolAssetAccountAddress &&
        poolAssetInboundAddress
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
      assetAddress: poolAssetAccountAddress,
      quoteInboundAddress: poolAssetInboundAddress,
    })
  }, [
    poolAssetAccountAddress,
    accountIdsByChainId,
    activeOpportunityId,
    actualAssetCryptoLiquidityAmount,
    actualAssetFiatLiquidityAmount,
    actualRuneCryptoLiquidityAmount,
    actualRuneFiatLiquidityAmount,
    isAsym,
    poolAssetInboundAddress,
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
              key={_asset.assetId}
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

      const parsedAsymSide = asymSide as AsymSide | 'sym'

      if (parsedAsymSide === 'sym') {
        setActiveOpportunityId(defaultOpportunityId)
        return
      }

      const assetPools = parsedPools.filter(pool => pool.assetId === asset.assetId)
      const foundPool = assetPools.find(pool => pool.asymSide === parsedAsymSide)
      if (!foundPool) return

      setActiveOpportunityId(foundPool.opportunityId)
    },
    [asset, defaultOpportunityId, parsedPools],
  )

  const notEnoughFeeAssetError = useMemo(
    () =>
      poolAssetFeeAsset &&
      bnOrZero(actualAssetCryptoLiquidityAmount).gt(0) &&
      !isEstimatedPoolAssetFeesDataLoading &&
      hasEnoughFeeAssetBalanceForTx === false,
    [
      actualAssetCryptoLiquidityAmount,
      hasEnoughFeeAssetBalanceForTx,
      isEstimatedPoolAssetFeesDataLoading,
      poolAssetFeeAsset,
    ],
  )

  const notEnoughPoolAssetError = useMemo(
    () =>
      asset &&
      bnOrZero(actualAssetCryptoLiquidityAmount).gt(0) &&
      hasEnoughPoolAssetBalanceForTx === false,
    [actualAssetCryptoLiquidityAmount, asset, hasEnoughPoolAssetBalanceForTx],
  )

  const confirmCopy = useMemo(() => {
    // Not enough *pool* asset, but possibly enough *fee* asset
    // Not enough *fee* asset
    if (poolAssetFeeAsset && notEnoughFeeAssetError)
      return translate('modals.send.errors.notEnoughNativeToken', {
        asset: poolAssetFeeAsset.symbol,
      })
    if (asset && notEnoughPoolAssetError) return translate('common.insufficientFunds')
    if (asset && isApprovalRequired)
      return translate(`transactionRow.parser.erc20.approveSymbol`, { symbol: asset.symbol })

    return translate('pools.addLiquidity')
  }, [
    asset,
    isApprovalRequired,
    notEnoughFeeAssetError,
    notEnoughPoolAssetError,
    poolAssetFeeAsset,
    translate,
  ])

  if (!foundPool || !asset || !rune) return null

  const hasUserEnteredValue = !!(
    virtualAssetCryptoLiquidityAmount &&
    virtualAssetFiatLiquidityAmount &&
    virtualRuneCryptoLiquidityAmount &&
    virtualRuneFiatLiquidityAmount
  )

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
        <Collapse in={hasUserEnteredValue}>
          <PoolSummary
            assetId={asset.assetId}
            runePerAsset={runePerAsset}
            shareOfPoolDecimalPercent={shareOfPoolDecimalPercent}
            isLoading={isSlippageLoading}
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
            isApprovalTxPending ||
            isSweepNeededLoading ||
            isEstimatedPoolAssetFeesDataError ||
            isEstimatedPoolAssetFeesDataLoading ||
            bnOrZero(actualAssetCryptoLiquidityAmount).isZero() ||
            notEnoughFeeAssetError
          }
          isLoading={
            isVotingPowerLoading ||
            isInboundAddressLoading ||
            isAllowanceDataLoading ||
            isApprovalTxPending ||
            isSweepNeededLoading ||
            isEstimatedPoolAssetFeesDataLoading
          }
          onClick={handleSubmit}
        >
          {confirmCopy}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
