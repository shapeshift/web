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
import { SwapperName } from '@shapeshiftoss/swapper'
import type { Asset, KnownChainIds, MarketData } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BiErrorCircle, BiSolidBoltCircle } from 'react-icons/bi'
import { FaPlus } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useAllowance } from 'react-queries/hooks/useAllowance'
import { useIsTradingActive } from 'react-queries/hooks/useIsTradingActive'
import { useQuoteEstimatedFeesQuery } from 'react-queries/hooks/useQuoteEstimatedFeesQuery'
import { selectInboundAddressData } from 'react-queries/selectors'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { TradeAssetSelect } from 'components/AssetSelection/AssetSelection'
import { SlippagePopover } from 'components/MultiHopTrade/components/SlippagePopover'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useIsSmartContractAddress } from 'hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import { calculateFees } from 'lib/fees/model'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { poolAssetIdToAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
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
import type { Opportunity } from 'pages/ThorChainLP/utils'
import { fromOpportunityId, toOpportunityId } from 'pages/ThorChainLP/utils'
import { selectIsSnapshotApiQueriesPending, selectVotingPower } from 'state/apis/snapshot/selectors'
import {
  selectAccountIdsByAssetId,
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
  poolAssetId?: string
  setConfirmedQuote: (quote: LpConfirmedDepositQuote) => void
  confirmedQuote: LpConfirmedDepositQuote | null
  accountIdsByChainId: Record<ChainId, AccountId>
  onAccountIdChange: (accountId: AccountId, assetId: AssetId) => void
}

export const AddLiquidityInput: React.FC<AddLiquidityInputProps> = ({
  headerComponent,
  opportunityId,
  poolAssetId,
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

  const votingPower = useAppSelector(selectVotingPower)
  const isSnapshotApiQueriesPending = useAppSelector(selectIsSnapshotApiQueriesPending)
  const isSnapInstalled = useIsSnapInstalled()
  const isVotingPowerLoading = useMemo(
    () => isSnapshotApiQueriesPending && votingPower === undefined,
    [isSnapshotApiQueriesPending, votingPower],
  )

  const [poolAsset, setPoolAsset] = useState<Asset | undefined>()
  const [slippageRune, setSlippageRune] = useState<string | undefined>()
  const [isSlippageLoading, setIsSlippageLoading] = useState(false)
  const [shareOfPoolDecimalPercent, setShareOfPoolDecimalPercent] = useState<string | undefined>()
  const [activeOpportunityId, setActiveOpportunityId] = useState<string | undefined>()
  const [approvalTxId, setApprovalTxId] = useState<string | null>(null)
  const [poolAssetAccountAddress, setPoolAssetAccountAddress] = useState<string | undefined>(
    undefined,
  )

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

  const { data: pools } = usePools()
  const assets = useAppSelector(selectAssets)

  const poolAssets = useMemo(() => {
    return [...new Set((pools ?? []).map(pool => assets[pool.assetId]).filter(isSome))]
  }, [assets, pools])

  const poolAssetIds = useMemo(() => {
    return poolAssets.map(poolAsset => poolAsset.assetId)
  }, [poolAssets])

  const { data: isSmartContractAccountAddress, isLoading: isSmartContractAccountAddressLoading } =
    useIsSmartContractAddress(poolAssetAccountAddress ?? '')

  const getDefaultOpportunityType = useCallback(
    (assetId: AssetId) => {
      const walletSupportsRune = walletSupportsChain({
        chainId: thorchainChainId,
        wallet,
        isSnapInstalled,
      })

      const walletSupportsAsset = walletSupportsChain({
        chainId: fromAssetId(assetId).chainId,
        wallet,
        isSnapInstalled,
      })

      const runeSupport = Boolean(
        walletSupportsRune && accountIdsByChainId[fromAssetId(thorchainAssetId).chainId]?.length,
      )
      const assetSupport = Boolean(
        walletSupportsAsset && accountIdsByChainId[fromAssetId(assetId).chainId]?.length,
      )

      if (runeSupport && assetSupport) return 'sym'
      if (assetSupport) return AsymSide.Asset
      if (runeSupport) return AsymSide.Rune
      return 'sym'
    },
    [wallet, isSnapInstalled, accountIdsByChainId],
  )

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
    if (!pools?.length) return

    const assetId = poolAssetIdToAssetId(poolAssetId ?? '')

    const walletSupportedOpportunity = pools.find(pool => {
      const { chainId } = fromAssetId(pool.assetId)
      return walletSupportsChain({ chainId, wallet, isSnapInstalled })
    })

    const opportunityType = getDefaultOpportunityType(
      assetId || walletSupportedOpportunity?.assetId || pools[0].assetId,
    )

    const poolOpportunityId = assetId ? `${assetId}*${opportunityType}` : ''

    return (
      opportunityId ||
      poolOpportunityId ||
      `${walletSupportedOpportunity?.assetId ?? pools[0].assetId}*${opportunityType}`
    )
  }, [pools, opportunityId, getDefaultOpportunityType, poolAssetId, isSnapInstalled, wallet])

  useEffect(() => setActiveOpportunityId(defaultOpportunityId ?? ''), [defaultOpportunityId])

  const { assetId, type: opportunityType } = useMemo<Partial<Opportunity>>(() => {
    if (!activeOpportunityId) return {}
    return fromOpportunityId(activeOpportunityId)
  }, [activeOpportunityId])

  const _poolAsset = useAppSelector(state => selectAssetById(state, assetId ?? ''))

  useEffect(() => _poolAsset && setPoolAsset(_poolAsset), [_poolAsset])

  const poolAssetMarketData = useAppSelector(state => selectMarketDataById(state, assetId ?? ''))
  const poolAssetAccountIds = useAppSelector(state =>
    selectAccountIdsByAssetId(state, { assetId: assetId ?? '' }),
  )
  const poolAssetAccountId = useMemo(() => {
    return accountIdsByChainId[assetId ? fromAssetId(assetId).chainId : '']
  }, [accountIdsByChainId, assetId])
  const poolAssetBalanceFilter = useMemo(() => {
    return { assetId, accountId: poolAssetAccountId }
  }, [assetId, poolAssetAccountId])
  const poolAssetBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, poolAssetBalanceFilter),
  )
  const poolAssetAccountMetadataFilter = useMemo(
    () => ({ accountId: poolAssetAccountId }),
    [poolAssetAccountId],
  )
  const poolAssetAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, poolAssetAccountMetadataFilter),
  )
  const poolAssetAccountNumberFilter = useMemo(() => {
    return { assetId: assetId ?? '', accountId: poolAssetAccountId ?? '' }
  }, [assetId, poolAssetAccountId])

  const poolAssetAccountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, poolAssetAccountNumberFilter),
  )

  const poolAssetFeeAsset = useAppSelector(state => selectFeeAssetById(state, assetId ?? ''))
  const poolAssetFeeAssetMarktData = useAppSelector(state =>
    selectMarketDataById(state, poolAssetFeeAsset?.assetId ?? ''),
  )
  const poolAssetFeeAssetBalanceFilter = useMemo(() => {
    return { assetId: poolAssetFeeAsset?.assetId, accountId: poolAssetAccountId }
  }, [poolAssetFeeAsset, poolAssetAccountId])
  const poolAssetFeeAssetBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, poolAssetFeeAssetBalanceFilter),
  )

  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const runeMarketData = useAppSelector(state => selectMarketDataById(state, thorchainAssetId))
  const runeAccountIds = useAppSelector(state =>
    selectAccountIdsByAssetId(state, { assetId: thorchainAssetId }),
  )
  const runeAccountId = useMemo(() => accountIdsByChainId[thorchainChainId], [accountIdsByChainId])
  const runeBalanceFilter = useMemo(() => {
    return { assetId: runeAsset?.assetId, accountId: runeAccountId }
  }, [runeAsset, runeAccountId])
  const runeBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, runeBalanceFilter),
  )

  const isAsym = useMemo(() => opportunityType !== 'sym', [opportunityType])
  const isAsymAssetSide = useMemo(() => opportunityType === AsymSide.Asset, [opportunityType])
  const isAsymRuneSide = useMemo(() => opportunityType === AsymSide.Rune, [opportunityType])

  const walletSupportsRune = useMemo(() => {
    const chainId = thorchainChainId
    const walletSupport = walletSupportsChain({ chainId, wallet, isSnapInstalled })
    return walletSupport && runeAccountIds.length > 0
  }, [isSnapInstalled, runeAccountIds.length, wallet])

  const walletSupportsAsset = useMemo(() => {
    if (!assetId) return false
    const chainId = fromAssetId(assetId).chainId
    const walletSupport = walletSupportsChain({ chainId, wallet, isSnapInstalled })
    return walletSupport && poolAssetAccountIds.length > 0
  }, [isSnapInstalled, assetId, poolAssetAccountIds.length, wallet])

  // While we do wallet feature detection, we may still end up with a pool type that the wallet doesn't support, which is expected either:
  // - as a default pool, so we can show some input and not some seemingly broken blank state
  // - when routed from "Your Positions" where an active opportunity was found from the RUNE or asset address, but the wallet
  // doesn't support one of the two
  const walletSupportsOpportunity = useMemo(() => {
    if (!opportunityType) return false
    if (opportunityType === 'sym') return walletSupportsAsset && walletSupportsRune
    if (opportunityType === AsymSide.Rune) return walletSupportsRune
    if (opportunityType === AsymSide.Asset) return walletSupportsAsset
  }, [opportunityType, walletSupportsAsset, walletSupportsRune])

  const handleBackClick = useCallback(() => {
    browserHistory.push('/pools')
  }, [browserHistory])

  const actualAssetCryptoLiquidityAmount = useMemo(() => {
    // Symmetrical & Asym Asset: assetAmount = virtual amount (no rebalance, so use values as is)
    // Asym Rune: assetAmount = '0' (will be rebalanced by thorchain)
    return !isAsym || isAsymAssetSide ? virtualAssetCryptoLiquidityAmount : '0'
  }, [isAsym, isAsymAssetSide, virtualAssetCryptoLiquidityAmount])

  const actualRuneCryptoLiquidityAmount = useMemo(() => {
    // Symmetrical & Asym Rune: runeAmount = virtual amount (no rebalance, so use values as is)
    // Asym Asset: runeAmount = '0' (will be rebalanced by thorchain)
    return !isAsym || isAsymRuneSide ? virtualRuneCryptoLiquidityAmount : '0'
  }, [isAsym, isAsymRuneSide, virtualRuneCryptoLiquidityAmount])

  const actualAssetFiatLiquidityAmount = useMemo(() => {
    // Symmetrical & Asym Asset: assetAmount = virtual amount (no rebalance, so use values as is)
    // Asym Rune: assetAmount = '0' (will be rebalanced by thorchain)
    return !isAsym || isAsymAssetSide ? virtualAssetFiatLiquidityAmount : '0'
  }, [isAsym, isAsymAssetSide, virtualAssetFiatLiquidityAmount])

  const actualRuneFiatLiquidityAmount = useMemo(() => {
    // Symmetrical & Asym Rune: runeAmount = virtual amount (no rebalance, so use values as is)
    // Asym Asset: runeAmount = '0' (will be rebalanced by thorchain)
    return !isAsym || isAsymRuneSide ? virtualRuneFiatLiquidityAmount : '0'
  }, [isAsym, isAsymRuneSide, virtualRuneFiatLiquidityAmount])

  const hasEnoughAssetBalance = useMemo(() => {
    const assetBalanceCryptoPrecision = fromBaseUnit(
      poolAssetBalanceCryptoBaseUnit,
      poolAsset?.precision ?? 0,
    )
    return bnOrZero(actualAssetCryptoLiquidityAmount).lte(assetBalanceCryptoPrecision)
  }, [poolAssetBalanceCryptoBaseUnit, poolAsset?.precision, actualAssetCryptoLiquidityAmount])

  const { data: inboundAddressesData, isLoading: isInboundAddressesDataLoading } = useQuery({
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

  const { isTradingActive, isLoading: isTradingActiveLoading } = useIsTradingActive({
    assetId: poolAsset?.assetId,
    enabled: Boolean(poolAsset?.assetId),
    swapperName: SwapperName.Thorchain,
  })

  const serializedApprovalTxIndex = useMemo(() => {
    if (!(approvalTxId && poolAssetAccountAddress && poolAssetAccountId)) return ''
    return serializeTxIndex(poolAssetAccountId, approvalTxId, poolAssetAccountAddress)
  }, [approvalTxId, poolAssetAccountAddress, poolAssetAccountId])

  const {
    mutate,
    isPending: isApprovalMutationPending,
    isSuccess: isApprovalMutationSuccess,
  } = useMutation({
    ...reactQueries.mutations.approve({
      assetId: poolAsset?.assetId,
      spender: inboundAddressesData?.router,
      from: poolAssetAccountAddress,
      amount: toBaseUnit(actualAssetCryptoLiquidityAmount, poolAsset?.precision ?? 0),
      wallet,
      accountNumber: poolAssetAccountNumber,
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
          poolAsset?.assetId,
          inboundAddressesData?.router,
          poolAssetAccountAddress,
        ),
      )
    })()
  }, [
    approvalTx,
    poolAsset?.assetId,
    inboundAddressesData?.router,
    isApprovalTxPending,
    poolAssetAccountAddress,
    queryClient,
  ])

  const { data: allowanceData, isLoading: isAllowanceDataLoading } = useAllowance({
    assetId: poolAsset?.assetId,
    spender: inboundAddressesData?.router,
    from: poolAssetAccountAddress,
  })

  const isApprovalRequired = useMemo(() => {
    if (!confirmedQuote) return false
    if (!poolAsset) return false
    if (!isToken(fromAssetId(poolAsset.assetId).assetReference)) return false
    const supportedEvmChainIds = getSupportedEvmChainIds()
    if (!supportedEvmChainIds.includes(fromAssetId(poolAsset.assetId).chainId as KnownChainIds))
      return false

    const allowanceCryptoPrecision = fromBaseUnit(allowanceData ?? '0', poolAsset.precision)
    return bnOrZero(actualAssetCryptoLiquidityAmount).gt(allowanceCryptoPrecision)
  }, [actualAssetCryptoLiquidityAmount, allowanceData, poolAsset, confirmedQuote])

  useEffect(() => {
    if (!(wallet && poolAsset && activeOpportunityId && poolAssetAccountMetadata)) return
    ;(async () => {
      const _accountAssetAddress = await getThorchainFromAddress({
        accountId: poolAssetAccountId,
        assetId: poolAsset?.assetId,
        opportunityId: activeOpportunityId,
        wallet,
        accountMetadata: poolAssetAccountMetadata,
        getPosition: getThorchainLpPosition,
      })
      setPoolAssetAccountAddress(_accountAssetAddress)
    })()
  }, [activeOpportunityId, poolAsset, poolAssetAccountId, poolAssetAccountMetadata, wallet])

  // Pool asset fee/balance/sweep data and checks

  const poolAssetInboundAddress = useMemo(() => {
    if (!poolAsset) return
    const transactionType = getThorchainLpTransactionType(poolAsset.chainId)

    switch (transactionType) {
      case 'MsgDeposit': {
        return THORCHAIN_POOL_MODULE_ADDRESS
      }
      case 'EvmCustomTx': {
        // TODO: this should really be inboundAddressData?.router, but useQuoteEstimatedFeesQuery doesn't yet handle contract calls
        // for the purpose of naively assuming a send, using the inbound address instead of the router is fine
        return inboundAddressesData?.address
      }
      case 'Send': {
        return inboundAddressesData?.address
      }
      default: {
        assertUnreachable(transactionType as never)
      }
    }
  }, [poolAsset, inboundAddressesData?.address])

  // We reuse lending utils here since all this does is estimating fees for a given deposit amount with a memo
  // It's not going to be 100% accurate for EVM chains as it doesn't calculate the cost of depositWithExpiry, but rather a simple send,
  // however that's fine for now until accurate fees estimation is implemented
  const {
    data: estimatedPoolAssetFeesData,
    isLoading: isEstimatedPoolAssetFeesDataLoading,
    isError: isEstimatedPoolAssetFeesDataError,
    isSuccess: isEstimatedPoolAssetFeesDataSuccess,
  } = useQuoteEstimatedFeesQuery({
    collateralAssetId: poolAsset?.assetId ?? '',
    collateralAccountId: poolAssetAccountId,
    depositAmountCryptoPrecision: actualAssetCryptoLiquidityAmount ?? '0',
    confirmedQuote,
  })

  // Checks if there's enough pool asset balance for the transaction, excluding fees
  const hasEnoughPoolAssetBalanceForTx = useMemo(() => {
    if (!poolAsset) return false

    const amountAvailableCryptoPrecision = fromBaseUnit(
      poolAssetBalanceCryptoBaseUnit,
      poolAsset.precision ?? 0,
    )

    return bnOrZero(actualAssetCryptoLiquidityAmount).lte(amountAvailableCryptoPrecision)
  }, [actualAssetCryptoLiquidityAmount, poolAsset, poolAssetBalanceCryptoBaseUnit])

  const poolAssetTxFeeCryptoPrecision = useMemo(
    () =>
      fromBaseUnit(
        estimatedPoolAssetFeesData?.txFeeCryptoBaseUnit ?? 0,
        poolAssetFeeAsset?.precision ?? 0,
      ),
    [estimatedPoolAssetFeesData?.txFeeCryptoBaseUnit, poolAssetFeeAsset?.precision],
  )

  // Checks if there's enough fee asset balance to cover the transaction fees
  const hasEnoughPoolAssetFeeAssetBalanceForTx = useMemo(() => {
    if (bnOrZero(actualAssetCryptoLiquidityAmount).isZero()) return true

    if (!isEstimatedPoolAssetFeesDataSuccess || !poolAsset) return false

    // If the asset is not a token, assume it's a native asset and fees are taken from the same asset balance
    if (!isToken(fromAssetId(poolAsset.assetId).assetReference)) {
      const assetAmountCryptoPrecision = toBaseUnit(
        actualAssetCryptoLiquidityAmount!,
        poolAsset?.precision,
      )
      return bnOrZero(assetAmountCryptoPrecision)
        .plus(estimatedPoolAssetFeesData?.txFeeCryptoBaseUnit)
        .lte(poolAssetBalanceCryptoBaseUnit)
    }

    // For tokens, check if the fee asset balance is enough to cover the fees - that's all we need, we don't need to account
    // for the asset itself in the calculation
    return bnOrZero(estimatedPoolAssetFeesData?.txFeeCryptoBaseUnit).lte(
      poolAssetFeeAssetBalanceCryptoBaseUnit,
    )
  }, [
    actualAssetCryptoLiquidityAmount,
    isEstimatedPoolAssetFeesDataSuccess,
    poolAsset,
    estimatedPoolAssetFeesData?.txFeeCryptoBaseUnit,
    poolAssetFeeAssetBalanceCryptoBaseUnit,
    poolAssetBalanceCryptoBaseUnit,
  ])

  // Combines the checks for pool asset balance and fee asset balance to ensure both are sufficient
  const hasEnoughPoolAssetBalanceForTxPlusFees = useMemo(() => {
    return hasEnoughPoolAssetBalanceForTx && hasEnoughPoolAssetFeeAssetBalanceForTx
  }, [hasEnoughPoolAssetBalanceForTx, hasEnoughPoolAssetFeeAssetBalanceForTx])

  const isSweepNeededArgs = useMemo(
    () => ({
      assetId: poolAsset?.assetId,
      address: poolAssetAccountAddress ?? null,
      amountCryptoBaseUnit: toBaseUnit(
        actualAssetCryptoLiquidityAmount ?? 0,
        poolAsset?.precision ?? 0,
      ),
      // Effectively defined at runtime because of the enabled check below
      txFeeCryptoBaseUnit: estimatedPoolAssetFeesData?.txFeeCryptoBaseUnit!,
      // Don't fetch sweep needed if there isn't enough balance for the tx + fees, since adding in a sweep Tx would obviously fail too
      // also, use that as balance checks instead of our current one, at least for the asset (not ROON)
      enabled: Boolean(
        !!poolAsset?.assetId &&
          bnOrZero(actualAssetCryptoLiquidityAmount).gt(0) &&
          isEstimatedPoolAssetFeesDataSuccess &&
          hasEnoughPoolAssetBalanceForTxPlusFees &&
          estimatedPoolAssetFeesData?.txFeeCryptoBaseUnit,
      ),
    }),
    [
      poolAssetAccountAddress,
      actualAssetCryptoLiquidityAmount,
      poolAsset?.assetId,
      poolAsset?.precision,
      estimatedPoolAssetFeesData,
      hasEnoughPoolAssetBalanceForTxPlusFees,
      isEstimatedPoolAssetFeesDataSuccess,
    ],
  )

  const { data: isSweepNeeded, isLoading: isSweepNeededLoading } =
    useIsSweepNeededQuery(isSweepNeededArgs)

  // Rune balance / gas data and checks

  // We reuse lending utils here since all this does is estimating fees for a given deposit amount with a memo
  // It's not going to be 100% accurate for EVM chains as it doesn't calculate the cost of depositWithExpiry, but rather a simple send,
  // however that's fine for now until accurate fees estimation is implemented
  const {
    data: estimatedRuneFeesData,
    isLoading: isEstimatedRuneFeesDataLoading,
    isError: isEstimatedRuneFeesDataError,
    isSuccess: isEstimatedRuneFeesDataSuccess,
  } = useQuoteEstimatedFeesQuery({
    collateralAssetId: thorchainAssetId,
    collateralAccountId: runeAccountId,
    depositAmountCryptoPrecision: actualRuneCryptoLiquidityAmount ?? '0',
    confirmedQuote,
  })

  const runeTxFeeCryptoPrecision = useMemo(
    () => fromBaseUnit(estimatedRuneFeesData?.txFeeCryptoBaseUnit ?? 0, runeAsset?.precision ?? 0),
    [estimatedRuneFeesData?.txFeeCryptoBaseUnit, runeAsset?.precision],
  )

  const hasEnoughRuneBalance = useMemo(() => {
    const runeBalanceCryptoPrecision = fromBaseUnit(
      runeBalanceCryptoBaseUnit,
      runeAsset?.precision ?? 0,
    )
    return bnOrZero(actualRuneCryptoLiquidityAmount).lte(runeBalanceCryptoPrecision)
  }, [runeBalanceCryptoBaseUnit, runeAsset?.precision, actualRuneCryptoLiquidityAmount])

  const hasEnoughRuneFeeBalanceForTx = useMemo(() => {
    if (bnOrZero(actualRuneCryptoLiquidityAmount).isZero()) return true
    if (!isEstimatedRuneFeesDataSuccess || !runeAsset) return false

    const runeAmountCryptoPrecision = toBaseUnit(
      actualRuneCryptoLiquidityAmount!,
      runeAsset?.precision,
    )

    return bnOrZero(runeAmountCryptoPrecision)
      .plus(estimatedRuneFeesData?.txFeeCryptoBaseUnit)
      .lte(runeBalanceCryptoBaseUnit)
  }, [
    actualRuneCryptoLiquidityAmount,
    estimatedRuneFeesData?.txFeeCryptoBaseUnit,
    isEstimatedRuneFeesDataSuccess,
    runeAsset,
    runeBalanceCryptoBaseUnit,
  ])

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

  const handleApprove = useCallback(() => mutate(undefined), [mutate])

  const handleSubmit = useCallback(() => {
    if (isApprovalRequired) {
      handleApprove()
      return
    }
    history.push(isSweepNeeded ? AddLiquidityRoutePaths.Sweep : AddLiquidityRoutePaths.Confirm)
  }, [handleApprove, history, isApprovalRequired, isSweepNeeded])

  const runePerAsset = useMemo(() => {
    if (!poolAssetMarketData || !runeMarketData) return undefined
    return bn(poolAssetMarketData.price).div(bn(runeMarketData.price)).toFixed()
  }, [poolAssetMarketData, runeMarketData])

  const createHandleAddLiquidityInputChange = useCallback(
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
        isTradingActive === false
      )
        return

      setIsSlippageLoading(true)

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
        assetId: poolAsset.assetId,
      })

      /*
        Slippage is denominated in RUNE. Since the virtual RUNE amount is always half of the total pool amount
        (for both sym and asym pools), and we want to display the total slippage across the entire position,
        we multiply the slippage by 2 to get the total slippage for the pool.
        */
      const slippageRune = bnOrZero(estimate.slipPercent)
        .div(100)
        .times(virtualRuneFiatLiquidityAmount ?? 0)
        .times(2)
        .toFixed()
      setSlippageRune(slippageRune)
      setIsSlippageLoading(false)
      setShareOfPoolDecimalPercent(estimate.poolShareDecimalPercent)
    })()
  }, [
    actualAssetCryptoLiquidityAmount,
    actualRuneCryptoLiquidityAmount,
    actualRuneFiatLiquidityAmount,
    poolAsset,
    isAsym,
    isAsymAssetSide,
    isAsymRuneSide,
    virtualRuneFiatLiquidityAmount,
    isTradingActive,
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
      assetCryptoDepositAmount: actualAssetCryptoLiquidityAmount,
      assetFiatDepositAmount: actualAssetFiatLiquidityAmount,
      runeCryptoDepositAmount: actualRuneCryptoLiquidityAmount,
      runeFiatDepositAmount: actualRuneFiatLiquidityAmount,
      shareOfPoolDecimalPercent,
      slippageRune,
      opportunityId: activeOpportunityId,
      accountIdsByChainId,
      totalAmountFiat,
      feeBps: feeBps.toFixed(0),
      feeAmountFiat: feeUsd.toFixed(2),
      assetAddress: poolAssetAccountAddress,
      quoteInboundAddress: poolAssetInboundAddress,
      runeGasFeeFiat: runeGasFeeFiat.toFixed(2),
      poolAssetGasFeeFiat: poolAssetGasFeeFiat.toFixed(2),
      totalGasFeeFiat,
    })
  }, [
    accountIdsByChainId,
    activeOpportunityId,
    actualAssetCryptoLiquidityAmount,
    actualAssetFiatLiquidityAmount,
    actualRuneCryptoLiquidityAmount,
    actualRuneFiatLiquidityAmount,
    isAsym,
    poolAssetAccountAddress,
    poolAssetFeeAssetMarktData.price,
    poolAssetGasFeeFiat,
    poolAssetInboundAddress,
    poolAssetTxFeeCryptoPrecision,
    runeGasFeeFiat,
    runeMarketData.price,
    runeTxFeeCryptoPrecision,
    setConfirmedQuote,
    shareOfPoolDecimalPercent,
    slippageRune,
    totalGasFeeFiat,
    votingPower,
  ])

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

          const accountId = accountIdsByChainId[asset.chainId]

          return (
            <TradeAssetInput
              accountId={accountId}
              key={asset.assetId}
              assetId={asset?.assetId}
              assetIcon={asset?.icon ?? ''}
              assetSymbol={asset?.symbol ?? ''}
              // eslint-disable-next-line react-memo/require-usememo
              onAccountIdChange={(accountId: AccountId) => {
                handleAccountIdChange(accountId, asset?.assetId)
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
    poolAsset,
    runeAsset,
    pairDivider,
    runeMarketData,
    poolAssetMarketData,
    createHandleAddLiquidityInputChange,
    virtualRuneCryptoLiquidityAmount,
    virtualAssetCryptoLiquidityAmount,
    virtualRuneFiatLiquidityAmount,
    virtualAssetFiatLiquidityAmount,
    accountIdsByChainId,
    percentOptions,
    handleAccountIdChange,
    opportunityType,
  ])

  const symAlert = useMemo(() => {
    if (!(runeAsset && poolAsset)) return null
    if (opportunityType === 'sym') return null

    const from = opportunityType === AsymSide.Rune ? runeAsset.symbol : poolAsset?.symbol
    const to = opportunityType === AsymSide.Rune ? poolAsset?.symbol : runeAsset.symbol

    return (
      <Alert status='info' mx={-2} width='auto'>
        <AlertIcon as={BiSolidBoltCircle} />
        <AlertDescription fontSize='sm' fontWeight='medium'>
          {translate('pools.symAlert', { from, to })}
        </AlertDescription>
      </Alert>
    )
  }, [poolAsset, runeAsset, translate, opportunityType])

  const maybeOpportunityNotSupportedExplainer = useMemo(() => {
    if (walletSupportsOpportunity) return null
    if (!poolAsset || !runeAsset) return null

    const translation = (() => {
      if (!walletSupportsRune && !walletSupportsAsset)
        return translate('pools.unsupportedNetworksExplainer', {
          network1: poolAsset.networkName,
          network2: runeAsset.networkName,
        })
      if (!walletSupportsRune)
        return translate('pools.unsupportedNetworkExplainer', { network: runeAsset.networkName })
      if (!walletSupportsAsset)
        return translate('pools.unsupportedNetworkExplainer', { network: poolAsset.networkName })
    })()

    return (
      <Alert status='error' mx={-2} width='auto'>
        <AlertIcon as={BiErrorCircle} />
        <AlertDescription fontSize='sm' fontWeight='medium'>
          {translation}
        </AlertDescription>
      </Alert>
    )
  }, [
    poolAsset,
    runeAsset,
    translate,
    walletSupportsAsset,
    walletSupportsOpportunity,
    walletSupportsRune,
  ])

  const handleAssetChange = useCallback(
    (asset: Asset) => {
      const type = getDefaultOpportunityType(asset.assetId)
      setActiveOpportunityId(toOpportunityId({ assetId: asset.assetId, type }))
    },
    [getDefaultOpportunityType],
  )

  const buyAssetSearch = useModal('buyAssetSearch')
  const handlePoolAssetClick = useCallback(() => {
    buyAssetSearch.open({
      onClick: handleAssetChange,
      title: 'pools.pool',
      assets: poolAssets,
    })
  }, [buyAssetSearch, poolAssets, handleAssetChange])

  const pairSelect = useMemo(() => {
    // We only want to show the pair select on standalone "Add Liquidity" - not on the position page
    if (opportunityId) return null

    return (
      <Stack>
        <FormLabel px={6} mb={0} fontSize='sm'>
          {translate('pools.selectPair')}
        </FormLabel>
        <TradeAssetSelect
          assetId={poolAsset?.assetId}
          assetIds={poolAssetIds}
          onAssetClick={handlePoolAssetClick}
          onAssetChange={handleAssetChange}
          isLoading={false}
          mb={0}
          buttonProps={buttonProps}
        />
        <TradeAssetSelect
          assetId={thorchainAssetId}
          isReadOnly
          isLoading={false}
          mb={0}
          buttonProps={buttonProps}
        />
      </Stack>
    )
  }, [
    opportunityId,
    translate,
    poolAsset?.assetId,
    poolAssetIds,
    handleAssetChange,
    handlePoolAssetClick,
  ])

  const handleAsymSideChange = useCallback(
    (asymSide: string | null) => {
      if (!asymSide) return
      if (!poolAsset) return

      setActiveOpportunityId(
        toOpportunityId({ assetId: poolAsset.assetId, type: asymSide as AsymSide | 'sym' }),
      )
    },
    [poolAsset],
  )

  const notEnoughFeeAssetError = useMemo(
    () =>
      poolAssetFeeAsset &&
      bnOrZero(actualAssetCryptoLiquidityAmount).gt(0) &&
      !isEstimatedPoolAssetFeesDataLoading &&
      hasEnoughPoolAssetFeeAssetBalanceForTx === false,
    [
      actualAssetCryptoLiquidityAmount,
      hasEnoughPoolAssetFeeAssetBalanceForTx,
      isEstimatedPoolAssetFeesDataLoading,
      poolAssetFeeAsset,
    ],
  )

  const notEnoughRuneFeeError = useMemo(
    () =>
      bnOrZero(actualRuneCryptoLiquidityAmount).gt(0) &&
      !isEstimatedRuneFeesDataLoading &&
      hasEnoughRuneFeeBalanceForTx === false,
    [actualRuneCryptoLiquidityAmount, hasEnoughRuneFeeBalanceForTx, isEstimatedRuneFeesDataLoading],
  )

  const notEnoughPoolAssetError = useMemo(
    () =>
      poolAsset &&
      bnOrZero(actualAssetCryptoLiquidityAmount).gt(0) &&
      hasEnoughPoolAssetBalanceForTx === false,
    [actualAssetCryptoLiquidityAmount, poolAsset, hasEnoughPoolAssetBalanceForTx],
  )

  const notEnoughRuneError = useMemo(
    () => bnOrZero(actualRuneCryptoLiquidityAmount).gt(0) && hasEnoughRuneBalance === false,
    [actualRuneCryptoLiquidityAmount, hasEnoughRuneBalance],
  )

  const errorCopy = useMemo(() => {
    // Order matters here. Since we're dealing with two assets potentially, we want to show the most relevant error message possible i.e
    // 1. Asset unsupported by wallet
    // 2. pool halted
    // 3. smart contract deposits disabled
    // 4. pool asset balance
    // 5. pool asset fee balance, since gas would usually be more expensive on the pool asset fee side vs. RUNE side
    // 6. RUNE balance
    // 7. RUNE fee balance
    // Not enough *pool* asset, but possibly enough *fee* asset
    if (!walletSupportsOpportunity) return translate('common.unsupportedNetwork')
    if (isTradingActive === false) return translate('common.poolHalted')
    if (isSmartContractAccountAddress === true)
      return translate('trade.errors.smartContractWalletNotSupported')
    if (poolAsset && notEnoughPoolAssetError) return translate('common.insufficientFunds')
    // Not enough *fee* asset
    if (poolAssetFeeAsset && notEnoughFeeAssetError)
      return translate('modals.send.errors.notEnoughNativeToken', {
        asset: poolAssetFeeAsset.symbol,
      })
    // Not enough RUNE, which should take precedence over not enough RUNE for fees
    if (runeAsset && notEnoughRuneError) return translate('common.insufficientFunds')
    // Not enough RUNE for fees
    if (runeAsset && notEnoughRuneFeeError)
      return translate('modals.send.errors.notEnoughNativeToken', {
        asset: runeAsset.symbol,
      })

    return null
  }, [
    isSmartContractAccountAddress,
    isTradingActive,
    notEnoughFeeAssetError,
    notEnoughPoolAssetError,
    notEnoughRuneError,
    notEnoughRuneFeeError,
    poolAsset,
    poolAssetFeeAsset,
    runeAsset,
    translate,
    walletSupportsOpportunity,
  ])

  const confirmCopy = useMemo(() => {
    if (errorCopy) return errorCopy
    if (poolAsset && isApprovalRequired)
      return translate(`transactionRow.parser.erc20.approveSymbol`, { symbol: poolAsset.symbol })

    return translate('pools.addLiquidity')
  }, [errorCopy, isApprovalRequired, poolAsset, translate])

  const divider = useMemo(() => <StackDivider borderColor='border.base' />, [])

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

  if (!poolAsset || !runeAsset) return null

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
          {!opportunityId && (
            <LpType
              assetId={poolAsset.assetId}
              defaultOpportunityId={activeOpportunityId}
              onAsymSideChange={handleAsymSideChange}
            />
          )}
          {tradeAssetInputs}
        </Stack>
        <Collapse in={hasUserEnteredValue}>
          <PoolSummary
            assetId={poolAsset.assetId}
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
            <Skeleton
              isLoaded={!isEstimatedPoolAssetFeesDataLoading && !isEstimatedRuneFeesDataLoading}
            >
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
        {maybeOpportunityNotSupportedExplainer}
        {symAlert}
        <Button
          mx={-2}
          size='lg'
          colorScheme={errorCopy ? 'red' : 'blue'}
          isDisabled={
            isTradingActive === false ||
            !confirmedQuote ||
            isVotingPowerLoading ||
            !hasEnoughAssetBalance ||
            !hasEnoughRuneBalance ||
            isApprovalTxPending ||
            isSweepNeededLoading ||
            isEstimatedPoolAssetFeesDataError ||
            isEstimatedRuneFeesDataError ||
            isEstimatedPoolAssetFeesDataLoading ||
            bnOrZero(actualAssetCryptoLiquidityAmount)
              .plus(actualRuneCryptoLiquidityAmount ?? 0)
              .isZero() ||
            notEnoughFeeAssetError ||
            notEnoughRuneFeeError ||
            !walletSupportsOpportunity
          }
          isLoading={
            isVotingPowerLoading ||
            isInboundAddressesDataLoading ||
            isTradingActiveLoading ||
            isSmartContractAccountAddressLoading ||
            isAllowanceDataLoading ||
            isApprovalTxPending ||
            isSweepNeededLoading ||
            isInboundAddressesDataLoading ||
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
