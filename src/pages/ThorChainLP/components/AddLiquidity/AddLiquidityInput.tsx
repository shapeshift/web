import { ArrowBackIcon, QuestionIcon } from '@chakra-ui/icons'
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
  useColorModeValue,
  usePrevious,
} from '@chakra-ui/react'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId, thorchainAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { Asset, KnownChainIds, MarketData } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
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
import { getAddress, zeroAddress } from 'viem'
import { Amount } from 'components/Amount/Amount'
import { TradeAssetSelect } from 'components/AssetSelection/AssetSelection'
import { FeeModal } from 'components/FeeModal/FeeModal'
import { SlippagePopover } from 'components/MultiHopTrade/components/SlippagePopover'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useIsSmartContractAddress } from 'hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import { calculateFees } from 'lib/fees/model'
import type { ParameterModel } from 'lib/fees/parameters/types'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import {
  assetIdToPoolAssetId,
  poolAssetIdToAssetId,
} from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { assertUnreachable, isSome, isToken } from 'lib/utils'
import { getSupportedEvmChainIds } from 'lib/utils/evm'
import { getThorchainFromAddress } from 'lib/utils/thorchain'
import { THOR_PRECISION, THORCHAIN_POOL_MODULE_ADDRESS } from 'lib/utils/thorchain/constants'
import {
  estimateAddThorchainLiquidityPosition,
  getThorchainLpTransactionType,
} from 'lib/utils/thorchain/lp'
import { AsymSide, type LpConfirmedDepositQuote } from 'lib/utils/thorchain/lp/types'
import { depositWithExpiry } from 'lib/utils/thorchain/routerCalldata'
import { useGetEstimatedFeesQuery } from 'pages/Lending/hooks/useGetEstimatedFeesQuery'
import { useIsSweepNeededQuery } from 'pages/Lending/hooks/useIsSweepNeededQuery'
import { usePools } from 'pages/ThorChainLP/queries/hooks/usePools'
import { getThorchainLpPosition } from 'pages/ThorChainLP/queries/queries'
import type { Opportunity } from 'pages/ThorChainLP/utils'
import { fromOpportunityId, toOpportunityId } from 'pages/ThorChainLP/utils'
import { selectIsSnapshotApiQueriesPending, selectVotingPower } from 'state/apis/snapshot/selectors'
import { snapshotApi } from 'state/apis/snapshot/snapshot'
import {
  selectAccountIdsByAssetId,
  selectAccountNumberByAccountId,
  selectAssetById,
  selectAssets,
  selectFeeAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadataByAccountId,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectTxById,
  selectUserCurrencyToUsdRate,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppDispatch, useAppSelector } from 'state/store'

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

const votingPowerParams: { feeModel: ParameterModel } = { feeModel: 'THORCHAIN_LP' }
const shapeShiftFeeModalRowHover = { textDecoration: 'underline', cursor: 'pointer' }
const shapeshiftFeeTranslation: TextPropTypes['translation'] = [
  'trade.tradeFeeSource',
  { tradeFeeSource: 'ShapeShift' },
]

export type AddLiquidityInputProps = {
  headerComponent?: JSX.Element
  opportunityId?: string
  poolAssetId?: string
  setConfirmedQuote: (quote: LpConfirmedDepositQuote) => void
  confirmedQuote: LpConfirmedDepositQuote | null
  currentAccountIdByChainId: Record<ChainId, AccountId>
  onAccountIdChange: (accountId: AccountId, assetId: AssetId) => void
}

export const AddLiquidityInput: React.FC<AddLiquidityInputProps> = ({
  headerComponent,
  opportunityId,
  poolAssetId,
  confirmedQuote,
  setConfirmedQuote,
  currentAccountIdByChainId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const greenColor = useColorModeValue('green.600', 'green.200')
  const dispatch = useAppDispatch()
  const wallet = useWallet().state.wallet
  const queryClient = useQueryClient()
  const translate = useTranslate()
  const { history: browserHistory } = useBrowserRouter()
  const history = useHistory()

  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)
  const votingPower = useAppSelector(state => selectVotingPower(state, votingPowerParams))
  const isSnapshotApiQueriesPending = useAppSelector(selectIsSnapshotApiQueriesPending)
  const isSnapInstalled = useIsSnapInstalled()
  const isVotingPowerLoading = useMemo(
    () => isSnapshotApiQueriesPending && votingPower === undefined,
    [isSnapshotApiQueriesPending, votingPower],
  )

  const [showFeeModal, toggleShowFeeModal] = useState(false)
  const [poolAsset, setPoolAsset] = useState<Asset | undefined>()
  const [slippageFiatUserCurrency, setSlippageFiatUserCurrency] = useState<string | undefined>()
  const [isSlippageLoading, setIsSlippageLoading] = useState(false)
  const [isSweepNeeded, setIsSweepNeeded] = useState<boolean | undefined>()
  const [shareOfPoolDecimalPercent, setShareOfPoolDecimalPercent] = useState<string | undefined>()
  const [activeOpportunityId, setActiveOpportunityId] = useState<string | undefined>()
  const previousOpportunityId = usePrevious(activeOpportunityId)

  const [approvalTxId, setApprovalTxId] = useState<string | null>(null)
  const [runeTxFeeCryptoBaseUnit, setRuneTxFeeCryptoBaseUnit] = useState<string | undefined>()
  const [poolAssetAccountAddress, setPoolAssetAccountAddress] = useState<string | undefined>(
    undefined,
  )
  const [poolAssetTxFeeCryptoBaseUnit, setPoolAssetTxFeeCryptoBaseUnit] = useState<
    string | undefined
  >()

  // Virtual as in, these are the amounts if depositing symetrically. But a user may deposit asymetrically, so these are not the *actual* amounts
  // Keeping these as virtual amounts is useful from a UI perspective, as it allows rebalancing to automagically work when switching from sym. type,
  // while using the *actual* amounts whenever we do things like checking for asset balance
  const [virtualAssetDepositAmountCryptoPrecision, setVirtualAssetDepositAmountCryptoPrecision] =
    useState<string | undefined>()
  const [virtualAssetDepositAmountFiatUserCurrency, setVirtualAssetDepositAmountFiatUserCurrency] =
    useState<string | undefined>()
  const [virtualRuneDepositAmountCryptoPrecision, setVirtualRuneDepositAmountCryptoPrecision] =
    useState<string | undefined>()
  const [virtualRuneDepositAmountFiatUserCurrency, setVirtualRuneDepositAmountFiatUserCurrency] =
    useState<string | undefined>()

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

  const accountIdsByAssetId = useAppSelector(selectPortfolioAccountIdsByAssetId)

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
        walletSupportsRune && accountIdsByAssetId[thorchainAssetId]?.length,
      )
      const assetSupport = Boolean(walletSupportsAsset && accountIdsByAssetId[assetId]?.length)

      if (runeSupport && assetSupport) return 'sym'
      if (assetSupport) return AsymSide.Asset
      if (runeSupport) return AsymSide.Rune
      return 'sym'
    },
    [wallet, isSnapInstalled, accountIdsByAssetId],
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
  useEffect(() => {
    if (activeOpportunityId) return
    if (opportunityId) return setActiveOpportunityId(opportunityId)

    if (!pools?.length) return

    const assetId = poolAssetIdToAssetId(poolAssetId ?? '')

    const walletSupportedOpportunity = pools.find(pool => {
      const { chainId } = fromAssetId(pool.assetId)
      return walletSupportsChain({ chainId, wallet, isSnapInstalled })
    })

    const opportunityType = getDefaultOpportunityType(
      assetId || walletSupportedOpportunity?.assetId || pools[0].assetId,
    )

    const defaultOpportunityId = toOpportunityId({
      assetId: assetId || walletSupportedOpportunity?.assetId || pools[0].assetId,
      type: opportunityType,
    })

    setActiveOpportunityId(defaultOpportunityId)
  }, [
    pools,
    opportunityId,
    activeOpportunityId,
    getDefaultOpportunityType,
    poolAssetId,
    isSnapInstalled,
    wallet,
  ])

  const { assetId, type: opportunityType } = useMemo<Partial<Opportunity>>(() => {
    if (!activeOpportunityId) return {}
    return fromOpportunityId(activeOpportunityId)
  }, [activeOpportunityId])

  const pool = useMemo(() => pools?.find(pool => pool.assetId === assetId), [assetId, pools])

  const _poolAsset = useAppSelector(state => selectAssetById(state, assetId ?? ''))

  useEffect(() => _poolAsset && setPoolAsset(_poolAsset), [_poolAsset])

  const poolAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId ?? ''),
  )
  const poolAssetAccountIds = useAppSelector(state =>
    selectAccountIdsByAssetId(state, { assetId: assetId ?? '' }),
  )
  const poolAssetAccountId = useMemo(() => {
    return currentAccountIdByChainId[assetId ? fromAssetId(assetId).chainId : '']
  }, [currentAccountIdByChainId, assetId])
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
    selectMarketDataByAssetIdUserCurrency(state, poolAssetFeeAsset?.assetId ?? ''),
  )
  const poolAssetFeeAssetBalanceFilter = useMemo(() => {
    return { assetId: poolAssetFeeAsset?.assetId, accountId: poolAssetAccountId }
  }, [poolAssetFeeAsset, poolAssetAccountId])
  const poolAssetFeeAssetBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, poolAssetFeeAssetBalanceFilter),
  )

  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const runeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId),
  )
  const runeAccountIds = useAppSelector(state =>
    selectAccountIdsByAssetId(state, { assetId: thorchainAssetId }),
  )
  const runeAccountId = useMemo(
    () => currentAccountIdByChainId[thorchainChainId],
    [currentAccountIdByChainId],
  )
  const runeBalanceFilter = useMemo(() => {
    return { assetId: runeAsset?.assetId, accountId: runeAccountId }
  }, [runeAsset, runeAccountId])
  const runeBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, runeBalanceFilter),
  )

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

  const toggleFeeModal = useCallback(() => {
    toggleShowFeeModal(!showFeeModal)
  }, [showFeeModal])

  const actualAssetDepositAmountCryptoPrecision = useMemo(() => {
    // Symmetrical & Asym Asset: assetAmount = virtual amount (no rebalance, so use values as is)
    if (opportunityType === 'sym') return virtualAssetDepositAmountCryptoPrecision
    if (opportunityType === AsymSide.Asset) return virtualAssetDepositAmountCryptoPrecision

    // Asym Rune: assetAmount = '0' (will be rebalanced by thorchain)
    return '0'
  }, [opportunityType, virtualAssetDepositAmountCryptoPrecision])

  const actualRuneDepositAmountCryptoPrecision = useMemo(() => {
    // Symmetrical & Asym Rune: runeAmount = virtual amount (no rebalance, so use values as is)
    if (opportunityType === 'sym') return virtualRuneDepositAmountCryptoPrecision
    if (opportunityType === AsymSide.Rune) return virtualRuneDepositAmountCryptoPrecision

    // Asym Asset: runeAmount = '0' (will be rebalanced by thorchain)
    return '0'
  }, [opportunityType, virtualRuneDepositAmountCryptoPrecision])

  const actualAssetDepositAmountFiatUserCurrency = useMemo(() => {
    // Symmetrical & Asym Asset: assetAmount = virtual amount (no rebalance, so use values as is)
    if (opportunityType === 'sym') return virtualAssetDepositAmountFiatUserCurrency
    if (opportunityType === AsymSide.Asset) return virtualAssetDepositAmountFiatUserCurrency

    // Asym Rune: assetAmount = '0' (will be rebalanced by thorchain)
    return '0'
  }, [opportunityType, virtualAssetDepositAmountFiatUserCurrency])

  const actualRuneDepositAmountFiatUserCurrency = useMemo(() => {
    // Symmetrical & Asym Rune: runeAmount = virtual amount (no rebalance, so use values as is)
    if (opportunityType === 'sym') return virtualRuneDepositAmountFiatUserCurrency
    if (opportunityType === AsymSide.Rune) return virtualRuneDepositAmountFiatUserCurrency

    // Asym Asset: runeAmount = '0' (will be rebalanced by thorchain)
    return '0'
  }, [opportunityType, virtualRuneDepositAmountFiatUserCurrency])

  const hasEnoughAssetBalance = useMemo(() => {
    const assetBalanceCryptoPrecision = fromBaseUnit(
      poolAssetBalanceCryptoBaseUnit,
      poolAsset?.precision ?? 0,
    )
    return bnOrZero(actualAssetDepositAmountCryptoPrecision).lte(assetBalanceCryptoPrecision)
  }, [
    poolAssetBalanceCryptoBaseUnit,
    poolAsset?.precision,
    actualAssetDepositAmountCryptoPrecision,
  ])

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
      amount: toBaseUnit(actualAssetDepositAmountCryptoPrecision, poolAsset?.precision ?? 0),
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
    return bnOrZero(actualAssetDepositAmountCryptoPrecision).gt(allowanceCryptoPrecision)
  }, [actualAssetDepositAmountCryptoPrecision, allowanceData, poolAsset, confirmedQuote])

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

  const thorchainNotationPoolAssetId = useMemo(() => {
    if (!poolAsset) return undefined
    return assetIdToPoolAssetId({
      assetId: poolAsset.assetId,
    })
  }, [poolAsset])

  const memo = useMemo(() => {
    if (thorchainNotationPoolAssetId === undefined) return

    if (opportunityType === 'sym') {
      return `+:${thorchainNotationPoolAssetId}:${poolAssetAccountAddress ?? ''}:ss:50`
    }

    return `+:${thorchainNotationPoolAssetId}::ss:50`
    // Note, bps is a placeholder and not the actual bps here, this memo is just used to estimate fees
  }, [opportunityType, poolAssetAccountAddress, thorchainNotationPoolAssetId])

  const estimateFeesArgs = useMemo(() => {
    if (!assetId || !wallet || !poolAsset || !memo || !poolAssetAccountAddress) return undefined

    const amountCryptoBaseUnit = toBaseUnit(
      actualAssetDepositAmountCryptoPrecision,
      poolAsset.precision,
    )

    const transactionType = getThorchainLpTransactionType(poolAsset.chainId)

    switch (transactionType) {
      case 'EvmCustomTx': {
        if (!inboundAddressesData?.router) return undefined

        const data = depositWithExpiry({
          vault: getAddress(inboundAddressesData.address),
          asset: isToken(fromAssetId(assetId).assetReference)
            ? getAddress(fromAssetId(assetId).assetReference)
            : // Native EVM asset deposits use the 0 address as the asset address
              // https://dev.thorchain.org/concepts/sending-transactions.html#admonition-info-1
              zeroAddress,
          amount: amountCryptoBaseUnit,
          memo,
          expiry: BigInt(dayjs().add(15, 'minute').unix()),
        })

        return {
          // amountCryptoPrecision is always denominated in fee asset - the only value we can send when calling a contract is native asset value
          amountCryptoPrecision: isToken(fromAssetId(assetId).assetReference)
            ? '0'
            : actualAssetDepositAmountCryptoPrecision,
          // It's a regular 0-value contract-call
          assetId: poolAsset?.assetId,
          to: inboundAddressesData.router,
          from: poolAssetAccountAddress,
          sendMax: false,
          // This is an ERC-20, we abuse the memo field for the actual hex-encoded calldata
          memo: data,
          accountId: poolAssetAccountId,
          // Note, this is NOT a send.
          // contractAddress is only needed when doing a send and the account interacts *directly* with the token's contract address.
          // Here, the LP contract is approved beforehand to spend the token value, which it will when calling depositWithExpiry()
          contractAddress: undefined,
        }
      }
      case 'Send': {
        if (!inboundAddressesData) return undefined
        return {
          amountCryptoPrecision: actualAssetDepositAmountCryptoPrecision,
          assetId: poolAsset.assetId,
          to: inboundAddressesData.address,
          from: poolAssetAccountAddress,
          sendMax: false,
          memo,
          accountId: poolAssetAccountId,
          contractAddress: undefined,
        }
      }
      default:
        return undefined
    }
  }, [
    assetId,
    wallet,
    poolAsset,
    memo,
    poolAssetAccountAddress,
    actualAssetDepositAmountCryptoPrecision,
    inboundAddressesData,
    poolAssetAccountId,
  ])

  const {
    data: estimatedPoolAssetFeesData,
    isLoading: isEstimatedPoolAssetFeesDataLoading,
    isError: isEstimatedPoolAssetFeesDataError,
  } = useGetEstimatedFeesQuery({
    amountCryptoPrecision: estimateFeesArgs?.amountCryptoPrecision ?? '0',
    assetId: estimateFeesArgs?.assetId ?? '',
    to: estimateFeesArgs?.to ?? '',
    sendMax: estimateFeesArgs?.sendMax ?? false,
    memo: estimateFeesArgs?.memo ?? '',
    accountId: estimateFeesArgs?.accountId ?? '',
    contractAddress: estimateFeesArgs?.contractAddress ?? '',
    enabled: !!estimateFeesArgs,
  })

  useEffect(() => {
    if (!estimatedPoolAssetFeesData) return
    setPoolAssetTxFeeCryptoBaseUnit(estimatedPoolAssetFeesData.txFeeCryptoBaseUnit)
  }, [estimatedPoolAssetFeesData])

  // Checks if there's enough pool asset balance for the transaction, excluding fees
  const hasEnoughPoolAssetBalanceForTx = useMemo(() => {
    if (!poolAsset) return false

    const amountAvailableCryptoPrecision = fromBaseUnit(
      poolAssetBalanceCryptoBaseUnit,
      poolAsset.precision ?? 0,
    )

    return bnOrZero(actualAssetDepositAmountCryptoPrecision).lte(amountAvailableCryptoPrecision)
  }, [actualAssetDepositAmountCryptoPrecision, poolAsset, poolAssetBalanceCryptoBaseUnit])

  const poolAssetTxFeeCryptoPrecision = useMemo(
    () => fromBaseUnit(poolAssetTxFeeCryptoBaseUnit ?? 0, poolAssetFeeAsset?.precision ?? 0),
    [poolAssetTxFeeCryptoBaseUnit, poolAssetFeeAsset?.precision],
  )

  // Checks if there's enough fee asset balance to cover the transaction fees
  const hasEnoughPoolAssetFeeAssetBalanceForTx = useMemo(() => {
    if (bnOrZero(actualAssetDepositAmountCryptoPrecision).isZero()) return true

    if (!poolAssetTxFeeCryptoBaseUnit || !poolAsset) return false

    // If the asset is not a token, assume it's a native asset and fees are taken from the same asset balance
    if (!isToken(fromAssetId(poolAsset.assetId).assetReference)) {
      const assetAmountCryptoBaseUnit = toBaseUnit(
        actualAssetDepositAmountCryptoPrecision!,
        poolAsset?.precision,
      )
      return bnOrZero(assetAmountCryptoBaseUnit)
        .plus(poolAssetTxFeeCryptoBaseUnit)
        .lte(poolAssetBalanceCryptoBaseUnit)
    }

    // For tokens, check if the fee asset balance is enough to cover the fees - that's all we need, we don't need to account
    // for the asset itself in the calculation
    return bnOrZero(poolAssetTxFeeCryptoBaseUnit).lte(poolAssetFeeAssetBalanceCryptoBaseUnit)
  }, [
    actualAssetDepositAmountCryptoPrecision,
    poolAsset,
    poolAssetBalanceCryptoBaseUnit,
    poolAssetFeeAssetBalanceCryptoBaseUnit,
    poolAssetTxFeeCryptoBaseUnit,
  ])

  // Combines the checks for pool asset balance and fee asset balance to ensure both are sufficient
  const hasEnoughPoolAssetBalanceForTxPlusFees = useMemo(() => {
    return hasEnoughPoolAssetBalanceForTx && hasEnoughPoolAssetFeeAssetBalanceForTx
  }, [hasEnoughPoolAssetBalanceForTx, hasEnoughPoolAssetFeeAssetBalanceForTx])

  const isSweepNeededEnabled = useMemo(() => {
    return Boolean(
      poolAsset &&
        bnOrZero(actualAssetDepositAmountCryptoPrecision).gt(0) &&
        hasEnoughPoolAssetBalanceForTxPlusFees &&
        poolAssetTxFeeCryptoBaseUnit,
    )
  }, [
    poolAsset,
    actualAssetDepositAmountCryptoPrecision,
    hasEnoughPoolAssetBalanceForTxPlusFees,
    poolAssetTxFeeCryptoBaseUnit,
  ])

  const isSweepNeededArgs = useMemo(
    () => ({
      assetId: poolAsset?.assetId,
      address: poolAssetAccountAddress ?? null,
      amountCryptoBaseUnit: toBaseUnit(
        actualAssetDepositAmountCryptoPrecision ?? 0,
        poolAsset?.precision ?? 0,
      ),
      // Effectively defined at runtime because of the enabled check below
      txFeeCryptoBaseUnit: poolAssetTxFeeCryptoBaseUnit!,
      // Don't fetch sweep needed if there isn't enough balance for the tx + fees, since adding in a sweep Tx would obviously fail too
      // also, use that as balance checks instead of our current one, at least for the asset (not ROON)
      enabled: isSweepNeededEnabled,
    }),
    [
      actualAssetDepositAmountCryptoPrecision,
      isSweepNeededEnabled,
      poolAsset,
      poolAssetAccountAddress,
      poolAssetTxFeeCryptoBaseUnit,
    ],
  )

  const {
    data: _isSweepNeeded,
    isLoading: isSweepNeededLoading,
    isError: isSweepNeededError,
  } = useIsSweepNeededQuery(isSweepNeededArgs)

  useEffect(() => {
    if (_isSweepNeeded === undefined) return
    setIsSweepNeeded(_isSweepNeeded)
  }, [_isSweepNeeded])

  // Rune balance / gas data and checks

  // We reuse lending utils here since all this does is estimating fees for a given deposit amount with a memo
  const {
    data: estimatedRuneFeesData,
    isLoading: isEstimatedRuneFeesDataLoading,
    isError: isEstimatedRuneFeesDataError,
  } = useQuoteEstimatedFeesQuery({
    collateralAssetId: thorchainAssetId,
    collateralAccountId: runeAccountId,
    depositAmountCryptoPrecision: actualRuneDepositAmountCryptoPrecision ?? '0',
    confirmedQuote,
  })

  useEffect(() => {
    if (!estimatedRuneFeesData) return
    setRuneTxFeeCryptoBaseUnit(estimatedRuneFeesData.txFeeCryptoBaseUnit)
  }, [estimatedRuneFeesData])

  const runeTxFeeCryptoPrecision = useMemo(
    () => fromBaseUnit(runeTxFeeCryptoBaseUnit ?? 0, runeAsset?.precision ?? 0),
    [runeTxFeeCryptoBaseUnit, runeAsset?.precision],
  )

  const hasEnoughRuneBalance = useMemo(() => {
    const runeBalanceCryptoPrecision = fromBaseUnit(
      runeBalanceCryptoBaseUnit,
      runeAsset?.precision ?? 0,
    )
    return bnOrZero(actualRuneDepositAmountCryptoPrecision).lte(runeBalanceCryptoPrecision)
  }, [runeBalanceCryptoBaseUnit, runeAsset?.precision, actualRuneDepositAmountCryptoPrecision])

  const hasEnoughRuneFeeBalanceForTx = useMemo(() => {
    if (bnOrZero(actualRuneDepositAmountCryptoPrecision).isZero()) return true

    if (!runeAsset) return false
    if (!runeTxFeeCryptoBaseUnit) return false

    const runeAmountCryptoBaseUnit = toBaseUnit(
      actualRuneDepositAmountCryptoPrecision!,
      runeAsset?.precision,
    )

    return bnOrZero(runeAmountCryptoBaseUnit)
      .plus(runeTxFeeCryptoBaseUnit)
      .lte(runeBalanceCryptoBaseUnit)
  }, [
    actualRuneDepositAmountCryptoPrecision,
    runeTxFeeCryptoBaseUnit,
    runeAsset,
    runeBalanceCryptoBaseUnit,
  ])

  const poolAssetGasFeeFiatUserCurrency = useMemo(
    () => bnOrZero(poolAssetTxFeeCryptoPrecision).times(poolAssetFeeAssetMarktData.price),
    [poolAssetFeeAssetMarktData.price, poolAssetTxFeeCryptoPrecision],
  )

  const runeGasFeeFiatUserCurrency = useMemo(
    () => bnOrZero(runeTxFeeCryptoPrecision).times(runeMarketData.price),
    [runeMarketData.price, runeTxFeeCryptoPrecision],
  )

  const totalGasFeeFiatUserCurrency = useMemo(
    () => poolAssetGasFeeFiatUserCurrency.plus(runeGasFeeFiatUserCurrency),
    [poolAssetGasFeeFiatUserCurrency, runeGasFeeFiatUserCurrency],
  )

  const handleApprove = useCallback(() => mutate(undefined), [mutate])

  const handleSubmit = useCallback(() => {
    if (isApprovalRequired) {
      handleApprove()
      return
    }
    history.push(isSweepNeeded ? AddLiquidityRoutePaths.Sweep : AddLiquidityRoutePaths.Confirm)
  }, [handleApprove, history, isApprovalRequired, isSweepNeeded])

  const runePerAsset = useMemo(() => pool?.assetPrice, [pool])

  const createHandleAddLiquidityInputChange = useCallback(
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
          setVirtualRuneDepositAmountCryptoPrecision(amountCryptoPrecision)
          setVirtualRuneDepositAmountFiatUserCurrency(amountFiatUserCurrency)
          setVirtualAssetDepositAmountFiatUserCurrency(amountFiatUserCurrency)
          setVirtualAssetDepositAmountCryptoPrecision(
            bnOrZero(amountCryptoPrecision).div(bnOrZero(runePerAsset)).toFixed(),
          )
        } else if (!isRune && bnOrZero(runePerAsset).isGreaterThan(0)) {
          setVirtualAssetDepositAmountCryptoPrecision(amountCryptoPrecision)
          setVirtualAssetDepositAmountFiatUserCurrency(amountFiatUserCurrency)
          setVirtualRuneDepositAmountFiatUserCurrency(amountFiatUserCurrency)
          setVirtualRuneDepositAmountCryptoPrecision(
            bnOrZero(amountCryptoPrecision).times(bnOrZero(runePerAsset)).toFixed(),
          )
        }
      }
    },
    [poolAsset, runePerAsset],
  )

  useEffect(() => {
    ;(async () => {
      if (!poolAsset) return
      if (!isTradingActive) return
      if (!actualRuneDepositAmountCryptoPrecision) return
      if (!actualAssetDepositAmountCryptoPrecision) return

      setIsSlippageLoading(true)

      const runeAmountThorBaseUnit = convertPrecision({
        value: actualRuneDepositAmountCryptoPrecision,
        inputExponent: 0,
        outputExponent: THOR_PRECISION,
      }).toFixed()

      const assetAmountThorBaseUnit = convertPrecision({
        value: actualAssetDepositAmountCryptoPrecision,
        inputExponent: 0,
        outputExponent: THOR_PRECISION,
      }).toFixed()

      const estimate = await estimateAddThorchainLiquidityPosition({
        runeAmountThorBaseUnit,
        assetAmountThorBaseUnit,
        assetId: poolAsset.assetId,
      })

      const _slippageFiatUserCurrency = bnOrZero(estimate.slippageRuneCryptoPrecision)
        .times(runeMarketData.price)
        .toFixed()

      setSlippageFiatUserCurrency(_slippageFiatUserCurrency)
      setIsSlippageLoading(false)
      setShareOfPoolDecimalPercent(estimate.poolShareDecimalPercent)
    })()
  }, [
    actualAssetDepositAmountCryptoPrecision,
    actualRuneDepositAmountCryptoPrecision,
    poolAsset,
    isTradingActive,
    runeMarketData,
  ])

  useEffect(() => {
    dispatch(
      snapshotApi.endpoints.getVotingPower.initiate(
        { model: 'THORCHAIN_LP' },
        // Fetch only once on mount to avoid overfetching
        { forceRefetch: false },
      ),
    )

    if (!slippageFiatUserCurrency) return
    if (!activeOpportunityId) return
    if (!poolAssetInboundAddress) return
    if (!actualAssetDepositAmountCryptoPrecision) return
    if (!actualAssetDepositAmountFiatUserCurrency) return
    if (!actualRuneDepositAmountCryptoPrecision) return
    if (!actualRuneDepositAmountFiatUserCurrency) return
    if (!shareOfPoolDecimalPercent) return

    const totalAmountFiatUserCurrency = bnOrZero(actualAssetDepositAmountFiatUserCurrency)
      .plus(actualRuneDepositAmountFiatUserCurrency)
      .toFixed()

    const totalAmountUsd = bnOrZero(totalAmountFiatUserCurrency)
      .div(userCurrencyToUsdRate)
      .toFixed()

    const { feeBps, feeUsd } = calculateFees({
      tradeAmountUsd: bn(totalAmountUsd),
      foxHeld: votingPower !== undefined ? bn(votingPower) : undefined,
      feeModel: 'THORCHAIN_LP',
    })

    setConfirmedQuote({
      assetDepositAmountCryptoPrecision: actualAssetDepositAmountCryptoPrecision,
      assetDepositAmountFiatUserCurrency: actualAssetDepositAmountFiatUserCurrency,
      runeDepositAmountCryptoPrecision: actualRuneDepositAmountCryptoPrecision,
      runeDepositAmountFiatUserCurrency: actualRuneDepositAmountFiatUserCurrency,
      shareOfPoolDecimalPercent,
      slippageFiatUserCurrency,
      opportunityId: activeOpportunityId,
      currentAccountIdByChainId,
      totalAmountUsd,
      feeBps: feeBps.toFixed(0),
      feeAmountFiatUserCurrency: feeUsd.times(userCurrencyToUsdRate).toFixed(2),
      feeAmountUSD: feeUsd.toFixed(2),
      assetAddress: poolAssetAccountAddress,
      quoteInboundAddress: poolAssetInboundAddress,
      runeGasFeeFiatUserCurrency: runeGasFeeFiatUserCurrency.toFixed(2),
      poolAssetGasFeeFiatUserCurrency: poolAssetGasFeeFiatUserCurrency.toFixed(2),
      totalGasFeeFiatUserCurrency: totalGasFeeFiatUserCurrency.toFixed(2),
    })
  }, [
    currentAccountIdByChainId,
    activeOpportunityId,
    actualAssetDepositAmountCryptoPrecision,
    actualAssetDepositAmountFiatUserCurrency,
    actualRuneDepositAmountCryptoPrecision,
    actualRuneDepositAmountFiatUserCurrency,
    dispatch,
    poolAssetAccountAddress,
    poolAssetGasFeeFiatUserCurrency,
    poolAssetInboundAddress,
    runeGasFeeFiatUserCurrency,
    setConfirmedQuote,
    shareOfPoolDecimalPercent,
    slippageFiatUserCurrency,
    totalGasFeeFiatUserCurrency,
    votingPower,
    userCurrencyToUsdRate,
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
          // Reset inputs on OpportunityId change
          if (activeOpportunityId !== previousOpportunityId) {
            handleAddLiquidityInputChange('0', false)
          }

          const cryptoAmount = isRune
            ? virtualRuneDepositAmountCryptoPrecision
            : virtualAssetDepositAmountCryptoPrecision
          const fiatAmount = isRune
            ? virtualRuneDepositAmountFiatUserCurrency
            : virtualAssetDepositAmountFiatUserCurrency

          const accountId = currentAccountIdByChainId[asset.chainId]

          return (
            <TradeAssetInput
              autoSelectHighestBalance={false}
              isAccountSelectionDisabled
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
    opportunityType,
    pairDivider,
    runeMarketData,
    poolAssetMarketData,
    createHandleAddLiquidityInputChange,
    activeOpportunityId,
    previousOpportunityId,
    virtualRuneDepositAmountCryptoPrecision,
    virtualAssetDepositAmountCryptoPrecision,
    virtualRuneDepositAmountFiatUserCurrency,
    virtualAssetDepositAmountFiatUserCurrency,
    currentAccountIdByChainId,
    percentOptions,
    handleAccountIdChange,
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
      bnOrZero(actualAssetDepositAmountCryptoPrecision).gt(0) &&
      !isEstimatedPoolAssetFeesDataLoading &&
      hasEnoughPoolAssetFeeAssetBalanceForTx === false,
    [
      actualAssetDepositAmountCryptoPrecision,
      hasEnoughPoolAssetFeeAssetBalanceForTx,
      isEstimatedPoolAssetFeesDataLoading,
      poolAssetFeeAsset,
    ],
  )

  const notEnoughRuneFeeError = useMemo(
    () =>
      bnOrZero(actualRuneDepositAmountCryptoPrecision).gt(0) &&
      !isEstimatedRuneFeesDataLoading &&
      hasEnoughRuneFeeBalanceForTx === false,
    [
      actualRuneDepositAmountCryptoPrecision,
      hasEnoughRuneFeeBalanceForTx,
      isEstimatedRuneFeesDataLoading,
    ],
  )

  const notEnoughPoolAssetError = useMemo(
    () =>
      poolAsset &&
      bnOrZero(actualAssetDepositAmountCryptoPrecision).gt(0) &&
      hasEnoughPoolAssetBalanceForTx === false,
    [actualAssetDepositAmountCryptoPrecision, poolAsset, hasEnoughPoolAssetBalanceForTx],
  )

  const notEnoughRuneError = useMemo(
    () => bnOrZero(actualRuneDepositAmountCryptoPrecision).gt(0) && hasEnoughRuneBalance === false,
    [actualRuneDepositAmountCryptoPrecision, hasEnoughRuneBalance],
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

  const hasUserEnteredValue = useMemo(() => {
    return Boolean(
      virtualAssetDepositAmountCryptoPrecision &&
        virtualAssetDepositAmountFiatUserCurrency &&
        virtualRuneDepositAmountCryptoPrecision &&
        virtualRuneDepositAmountFiatUserCurrency,
    )
  }, [
    virtualAssetDepositAmountCryptoPrecision,
    virtualAssetDepositAmountFiatUserCurrency,
    virtualRuneDepositAmountCryptoPrecision,
    virtualRuneDepositAmountFiatUserCurrency,
  ])

  if (!poolAsset || !runeAsset) return null

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
              opportunityId={activeOpportunityId}
              onAsymSideChange={handleAsymSideChange}
            />
          )}
          {tradeAssetInputs}
        </Stack>
      </Stack>
      <Collapse in={hasUserEnteredValue}>
        <PoolSummary
          assetId={poolAsset.assetId}
          runePerAsset={runePerAsset}
          shareOfPoolDecimalPercent={shareOfPoolDecimalPercent}
          isLoading={isSlippageLoading}
        />
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
              <Skeleton isLoaded={Boolean(confirmedQuote)}>
                <Amount.Fiat value={confirmedQuote?.totalGasFeeFiatUserCurrency ?? 0} />
              </Skeleton>
            </Row.Value>
          </Row>
          <Row fontSize='sm' fontWeight='medium' isLoading={Boolean(!confirmedQuote)}>
            <Row.Label display='flex'>
              <Text translation={shapeshiftFeeTranslation} />
              {bnOrZero(confirmedQuote?.feeAmountFiatUserCurrency).gt(0) && (
                <RawText>{`(${confirmedQuote?.feeBps ?? 0} bps)`}</RawText>
              )}
            </Row.Label>
            <Row.Value onClick={toggleFeeModal} _hover={shapeShiftFeeModalRowHover}>
              <Flex alignItems='center' gap={2}>
                {bnOrZero(confirmedQuote?.feeAmountFiatUserCurrency).gt(0) ? (
                  <>
                    <Amount.Fiat value={confirmedQuote?.feeAmountFiatUserCurrency ?? 0} />
                    <QuestionIcon />
                  </>
                ) : (
                  <>
                    <Text translation='trade.free' fontWeight='semibold' color={greenColor} />
                    <QuestionIcon color={greenColor} />
                  </>
                )}
              </Flex>
            </Row.Value>
          </Row>
        </CardFooter>
      </Collapse>
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
            !votingPower ||
            isVotingPowerLoading ||
            !hasEnoughAssetBalance ||
            !hasEnoughRuneBalance ||
            isApprovalTxPending ||
            (isSweepNeededEnabled && isSweepNeeded === undefined) ||
            poolAssetTxFeeCryptoBaseUnit === undefined ||
            runeTxFeeCryptoBaseUnit === undefined ||
            isSweepNeededError ||
            isEstimatedPoolAssetFeesDataError ||
            isEstimatedRuneFeesDataError ||
            bnOrZero(actualAssetDepositAmountCryptoPrecision)
              .plus(actualRuneDepositAmountCryptoPrecision ?? 0)
              .isZero() ||
            notEnoughFeeAssetError ||
            notEnoughRuneFeeError ||
            !walletSupportsOpportunity
          }
          isLoading={
            (poolAssetTxFeeCryptoBaseUnit === undefined && isEstimatedPoolAssetFeesDataLoading) ||
            isVotingPowerLoading ||
            isInboundAddressesDataLoading ||
            isTradingActiveLoading ||
            isSmartContractAccountAddressLoading ||
            isAllowanceDataLoading ||
            isApprovalTxPending ||
            (isSweepNeeded === undefined && isSweepNeededLoading) ||
            isInboundAddressesDataLoading ||
            (runeTxFeeCryptoBaseUnit === undefined && isEstimatedPoolAssetFeesDataLoading)
          }
          onClick={handleSubmit}
        >
          {confirmCopy}
        </Button>
      </CardFooter>
      <FeeModal
        affiliateFeeAmountUsd={confirmedQuote?.feeAmountUSD ?? '0'}
        isOpen={showFeeModal}
        onClose={toggleFeeModal}
        inputAmountUsd={confirmedQuote?.totalAmountUsd}
        feeModel='THORCHAIN_LP'
      />
    </SlideTransition>
  )
}
