import { ArrowBackIcon, QuestionIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
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
import {
  fromAccountId,
  fromAssetId,
  rujiAssetId,
  tcyAssetId,
  thorchainAssetId,
  thorchainChainId,
} from '@shapeshiftoss/caip'
import {
  assetIdToThorPoolAssetId,
  SwapperName,
  thorPoolAssetIdToAssetId,
} from '@shapeshiftoss/swapper'
import type { Asset, MarketData } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { isToken } from '@shapeshiftoss/utils'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BiErrorCircle, BiSolidBoltCircle } from 'react-icons/bi'
import { FaPlus } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import type { AmountsByPosition } from '../LpType'
import { LpType } from '../LpType'
import { ReadOnlyAsset } from '../ReadOnlyAsset'
import { PoolSummary } from './components/PoolSummary'
import { AddLiquidityRoutePaths } from './types'

import { InfoAcknowledgement } from '@/components/Acknowledgement/InfoAcknowledgement'
import { WarningAcknowledgement } from '@/components/Acknowledgement/WarningAcknowledgement'
import { Amount } from '@/components/Amount/Amount'
import { TradeAssetSelect } from '@/components/AssetSelection/AssetSelection'
import { ButtonWalletPredicate } from '@/components/ButtonWalletPredicate/ButtonWalletPredicate'
import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import { TradeAssetInput } from '@/components/MultiHopTrade/components/TradeAssetInput'
import { Row } from '@/components/Row/Row'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText, Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { useAllowanceApprovalRequirements } from '@/hooks/queries/useAllowanceApprovalRequirements'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useIsSmartContractAddress } from '@/hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useModal } from '@/hooks/useModal/useModal'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useToggle } from '@/hooks/useToggle/useToggle'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { walletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bn, bnOrZero, convertPrecision } from '@/lib/bignumber/bignumber'
import { DEFAULT_FEE_BPS } from '@/lib/fees/constant'
import { calculateFeeUsd } from '@/lib/fees/utils'
import { fromBaseUnit, toBaseUnit } from '@/lib/math'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { assertUnreachable, chainIdToChainDisplayName, isNonEmptyString, isSome } from '@/lib/utils'
import { THOR_PRECISION } from '@/lib/utils/thorchain/constants'
import { useIsChainHalted } from '@/lib/utils/thorchain/hooks/useIsChainHalted'
import { useIsLpDepositEnabled } from '@/lib/utils/thorchain/hooks/useIsThorchainLpDepositEnabled'
import { useSendThorTx } from '@/lib/utils/thorchain/hooks/useSendThorTx'
import { useThorchainFromAddress } from '@/lib/utils/thorchain/hooks/useThorchainFromAddress'
import { useThorchainMimirTimes } from '@/lib/utils/thorchain/hooks/useThorchainMimirTimes'
import { estimateAddThorchainLiquidityPosition } from '@/lib/utils/thorchain/lp'
import type { LpConfirmedDepositQuote } from '@/lib/utils/thorchain/lp/types'
import { AsymSide } from '@/lib/utils/thorchain/lp/types'
import { formatSecondsToDuration } from '@/lib/utils/time'
import { useIsSweepNeededQuery } from '@/pages/Lending/hooks/useIsSweepNeededQuery'
import { usePools } from '@/pages/ThorChainLP/queries/hooks/usePools'
import { useUserLpData } from '@/pages/ThorChainLP/queries/hooks/useUserLpData'
import { getThorchainLpPosition } from '@/pages/ThorChainLP/queries/queries'
import type { Opportunity } from '@/pages/ThorChainLP/utils'
import { fromOpportunityId, toOpportunityId } from '@/pages/ThorChainLP/utils'
import { reactQueries } from '@/react-queries'
import { useIsTradingActive } from '@/react-queries/hooks/useIsTradingActive'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
} from '@/state/slices/actionSlice/types'
import {
  selectAccountIdsByAssetId,
  selectAccountIdsByChainId,
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
} from '@/state/slices/selectors'
import { serializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import { useAppDispatch, useAppSelector } from '@/state/store'

const UNSAFE_SLIPPAGE_DECIMAL_PERCENT = 0.05 // 5%

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
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()
  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })
  const mixpanel = getMixPanel()
  const greenColor = useColorModeValue('green.600', 'green.200')
  const dispatch = useAppDispatch()
  const { wallet, isConnected } = useWallet().state
  const queryClient = useQueryClient()
  const translate = useTranslate()
  const { navigate: browserNavigate } = useBrowserRouter()
  const navigate = useNavigate()
  const [isFiat, toggleIsFiat] = useToggle(false)

  const accountIdsByChainId = useAppSelector(selectAccountIdsByChainId)
  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)
  const { isSnapInstalled } = useIsSnapInstalled()

  const [poolAsset, setPoolAsset] = useState<Asset | undefined>()
  const [slippageFiatUserCurrency, setSlippageFiatUserCurrency] = useState<string | undefined>()
  const [isSlippageLoading, setIsSlippageLoading] = useState(false)
  const [shareOfPoolDecimalPercent, setShareOfPoolDecimalPercent] = useState<string | undefined>()
  const [activeOpportunityId, setActiveOpportunityId] = useState<string | undefined>()
  const previousOpportunityId = usePrevious(activeOpportunityId)

  const [approvalTxId, setApprovalTxId] = useState<string | null>(null)
  const [isApprovalRequired, setIsApprovalRequired] = useState<boolean | undefined>(false)
  const [runeTxFeeCryptoBaseUnit, setRuneTxFeeCryptoBaseUnit] = useState<string | undefined>()
  const [poolAssetTxFeeCryptoBaseUnit, setPoolAssetTxFeeCryptoBaseUnit] = useState<
    string | undefined
  >()
  const [shouldShowWarningAcknowledgement, setShouldShowWarningAcknowledgement] = useState(false)
  const [shouldShowInfoAcknowledgement, setShouldShowInfoAcknowledgement] = useState(false)

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

  const [slippageDecimalPercentage, setSlippageDecimalPercentage] = useState<string | undefined>()

  const isUnsafeQuote = useMemo(
    () =>
      slippageDecimalPercentage &&
      bn(slippageDecimalPercentage).gt(UNSAFE_SLIPPAGE_DECIMAL_PERCENT),
    [slippageDecimalPercentage],
  )

  const { data: pools } = usePools()
  const assets = useAppSelector(selectAssets)

  const poolAssets = useMemo(() => {
    return [...new Set((pools ?? []).map(pool => assets[pool.assetId]).filter(isSome))]
  }, [assets, pools])

  const poolAssetIds = useMemo(() => {
    return poolAssets.map(poolAsset => poolAsset.assetId)
  }, [poolAssets])

  const poolAssetAccountId = useMemo(() => {
    return currentAccountIdByChainId[
      poolAsset?.assetId ? fromAssetId(poolAsset.assetId).chainId : ''
    ]
  }, [currentAccountIdByChainId, poolAsset?.assetId])

  const poolAssetAccountMetadataFilter = useMemo(
    () => ({ accountId: poolAssetAccountId }),
    [poolAssetAccountId],
  )

  const poolAssetAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, poolAssetAccountMetadataFilter),
  )

  const { data: thorchainMimirTimes, isLoading: isThorchainMimirTimesLoading } =
    useThorchainMimirTimes()

  const { data: poolAssetAccountAddress } = useThorchainFromAddress({
    accountId: poolAssetAccountId,
    assetId: poolAsset?.assetId,
    opportunityId: activeOpportunityId,
    wallet,
    accountMetadata: poolAssetAccountMetadata,
    getPosition: getThorchainLpPosition,
  })

  const { data: isSmartContractAccountAddress, isLoading: isSmartContractAccountAddressLoading } =
    useIsSmartContractAddress(poolAssetAccountAddress ?? '', poolAsset?.chainId ?? '')

  const accountIdsByAssetId = useAppSelector(selectPortfolioAccountIdsByAssetId)

  const getDefaultOpportunityType = useCallback(
    (assetId: AssetId) => {
      // https://gitlab.com/thorchain/thornode/-/issues/2214
      if (assetId === tcyAssetId || assetId === rujiAssetId) {
        return 'sym'
      }

      const walletSupportsRune = walletSupportsChain({
        checkConnectedAccountIds: accountIdsByChainId[thorchainChainId] ?? [],
        chainId: thorchainChainId,
        wallet,
        isSnapInstalled,
      })

      const walletSupportsAsset = walletSupportsChain({
        checkConnectedAccountIds: accountIdsByChainId[fromAssetId(assetId).chainId] ?? [],
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
    [accountIdsByChainId, wallet, isSnapInstalled, accountIdsByAssetId],
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

    const assetId = thorPoolAssetIdToAssetId(poolAssetId ?? '')

    const walletSupportedOpportunity = pools.find(pool => {
      const { chainId } = fromAssetId(pool.assetId)
      const chainAccountIds = accountIdsByChainId[chainId] ?? []
      return walletSupportsChain({
        checkConnectedAccountIds: chainAccountIds,
        chainId,
        wallet,
        isSnapInstalled,
      })
    })

    const opportunityType = getDefaultOpportunityType(
      assetId || walletSupportedOpportunity?.assetId || pools[0].assetId,
    )

    const defaultOpportunityId = toOpportunityId({
      assetId: assetId || walletSupportedOpportunity?.assetId || pools[0].assetId,
      opportunityType,
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
    accountIdsByChainId,
  ])

  const { assetId, opportunityType } = useMemo<Partial<Opportunity>>(() => {
    if (!activeOpportunityId) return {}
    return fromOpportunityId(activeOpportunityId)
  }, [activeOpportunityId])

  const pool = useMemo(() => pools?.find(pool => pool.assetId === assetId), [assetId, pools])

  const { data: userLpData } = useUserLpData({ assetId: assetId ?? '' })

  const hasAsymRunePosition = useMemo(() => {
    if (!userLpData) return false
    return userLpData.some(position => position.asym?.side === AsymSide.Rune)
  }, [userLpData])

  const hasAsymAssetPosition = useMemo(() => {
    if (!userLpData) return false
    return userLpData.some(position => position.asym?.side === AsymSide.Asset)
  }, [userLpData])

  const hasSymPosition = useMemo(() => {
    if (!userLpData) return false
    return userLpData.some(position => !position.asym)
  }, [userLpData])

  const disabledSymDepositAfterRune = useMemo(
    () => opportunityType === 'sym' && hasAsymRunePosition,
    [hasAsymRunePosition, opportunityType],
  )

  const amountsByPosition: AmountsByPosition | undefined = useMemo(() => {
    if (!userLpData?.length) return

    return userLpData.reduce((acc, position) => {
      return {
        ...acc,
        [!position.asym ? 'sym' : position.asym.side]: {
          underlyingAssetAmountCryptoPrecision: position.underlyingAssetAmountCryptoPrecision,
          underlyingRuneAmountCryptoPrecision: position.underlyingRuneAmountCryptoPrecision,
        },
      }
    }, {} as AmountsByPosition)
  }, [userLpData])

  const position = useMemo(() => {
    return userLpData?.find(data => data.opportunityId === activeOpportunityId)
  }, [activeOpportunityId, userLpData])

  const incompleteSide = useMemo(() => {
    if (!position?.status.incomplete) return

    return position.status.incomplete.asset.assetId === thorchainAssetId
      ? AsymSide.Rune
      : AsymSide.Asset
  }, [position])

  const _poolAsset = useAppSelector(state => selectAssetById(state, assetId ?? ''))

  useEffect(() => _poolAsset && setPoolAsset(_poolAsset), [_poolAsset])

  const poolAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId ?? ''),
  )
  const poolAssetAccountIds = useAppSelector(state =>
    selectAccountIdsByAssetId(state, { assetId: assetId ?? '' }),
  )
  const poolAssetBalanceFilter = useMemo(() => {
    return { assetId, accountId: poolAssetAccountId }
  }, [assetId, poolAssetAccountId])
  const poolAssetBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, poolAssetBalanceFilter),
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
    const chainAccountIds = accountIdsByChainId[chainId] ?? []
    const walletSupport = walletSupportsChain({
      checkConnectedAccountIds: chainAccountIds,
      chainId,
      wallet,
      isSnapInstalled,
    })
    return walletSupport && runeAccountIds.length > 0
  }, [accountIdsByChainId, isSnapInstalled, runeAccountIds.length, wallet])

  const walletSupportsAsset = useMemo(() => {
    if (!assetId) return false
    const chainId = fromAssetId(assetId).chainId
    const chainAccountIds = accountIdsByChainId[chainId] ?? []
    const walletSupport = walletSupportsChain({
      checkConnectedAccountIds: chainAccountIds,
      chainId,
      wallet,
      isSnapInstalled,
    })
    return walletSupport && poolAssetAccountIds.length > 0
  }, [assetId, accountIdsByChainId, wallet, isSnapInstalled, poolAssetAccountIds.length])

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

  const handleToggleIsFiat = useCallback(
    (_isFiat: boolean) => {
      toggleIsFiat()
    },
    [toggleIsFiat],
  )

  const handleBackClick = useCallback(() => {
    browserNavigate(-1)
  }, [browserNavigate])

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

  const thorchainNotationPoolAssetId = useMemo(() => {
    if (!poolAsset) return undefined
    return assetIdToThorPoolAssetId({
      assetId: poolAsset.assetId,
    })
  }, [poolAsset])

  const isThorchainLpDepositFlagEnabled = useFeatureFlag('ThorchainLpDeposit')
  const { data: isThorchainLpDepositEnabledForPool } = useIsLpDepositEnabled(poolAsset?.assetId)
  const isThorchainLpDepositEnabled =
    isThorchainLpDepositFlagEnabled && isThorchainLpDepositEnabledForPool !== false

  const feeEstimationMemo = useMemo(() => {
    if (thorchainNotationPoolAssetId === undefined) return null

    if (opportunityType === 'sym') {
      return `+:${thorchainNotationPoolAssetId}:${poolAssetAccountAddress ?? ''}`
    }

    return `+:${thorchainNotationPoolAssetId}`
  }, [opportunityType, poolAssetAccountAddress, thorchainNotationPoolAssetId])

  const {
    estimatedFeesData: estimatedPoolAssetFeesData,
    isEstimatedFeesDataLoading: isEstimatedPoolAssetFeesDataLoading,
    isEstimatedFeesDataError: isEstimatedPoolAssetFeesDataError,
    inboundAddress: poolAssetInboundAddress,
  } = useSendThorTx({
    assetId: poolAsset?.assetId,
    accountId: poolAssetAccountId,
    amountCryptoBaseUnit: toBaseUnit(
      actualAssetDepositAmountCryptoPrecision,
      poolAsset?.precision ?? 0,
    ),
    memo: feeEstimationMemo,
    fromAddress: poolAssetAccountAddress ?? null,
    action: 'addLiquidity',
    enableEstimateFees: Boolean(
      bnOrZero(actualAssetDepositAmountCryptoPrecision).gt(0) &&
        !isApprovalRequired &&
        incompleteSide !== AsymSide.Rune,
    ),
  })

  const {
    isLoading: isApprovalRequirementsLoading,
    isAllowanceApprovalRequired: _isApprovalRequired,
    isAllowanceResetRequired,
  } = useAllowanceApprovalRequirements({
    amountCryptoBaseUnit:
      poolAsset && actualAssetDepositAmountCryptoPrecision
        ? toBaseUnit(actualAssetDepositAmountCryptoPrecision, poolAsset.precision)
        : undefined,
    assetId: poolAsset?.assetId,
    from: poolAssetAccountAddress,
    spender: poolAssetInboundAddress,
  })

  useEffect(() => {
    setIsApprovalRequired(_isApprovalRequired)
  }, [_isApprovalRequired])

  const hasEnoughAssetBalance = useMemo(() => {
    if (incompleteSide === AsymSide.Rune) return true

    const assetBalanceCryptoPrecision = fromBaseUnit(
      poolAssetBalanceCryptoBaseUnit,
      poolAsset?.precision ?? 0,
    )

    return bnOrZero(actualAssetDepositAmountCryptoPrecision).lte(assetBalanceCryptoPrecision)
  }, [
    actualAssetDepositAmountCryptoPrecision,
    incompleteSide,
    poolAsset?.precision,
    poolAssetBalanceCryptoBaseUnit,
  ])

  const { isTradingActive, isLoading: isTradingActiveLoading } = useIsTradingActive({
    assetId: poolAsset?.assetId,
    swapperName: SwapperName.Thorchain,
  })

  const { isChainHalted, isFetching: isChainHaltedFetching } = useIsChainHalted(poolAsset?.chainId)

  const serializedApprovalTxIndex = useMemo(() => {
    if (!(approvalTxId && poolAssetAccountAddress && poolAssetAccountId)) return ''
    return serializeTxIndex(poolAssetAccountId, approvalTxId, poolAssetAccountAddress)
  }, [approvalTxId, poolAssetAccountAddress, poolAssetAccountId])

  const approvalAmountCryptoBaseUnit = useMemo(
    () =>
      toBaseUnit(
        isAllowanceResetRequired ? '0' : actualAssetDepositAmountCryptoPrecision,
        poolAsset?.precision ?? 0,
        BigNumber.ROUND_UP,
      ),
    [actualAssetDepositAmountCryptoPrecision, isAllowanceResetRequired, poolAsset?.precision],
  )

  const {
    mutate,
    isPending: isApprovalMutationPending,
    isSuccess: isApprovalMutationSuccess,
  } = useMutation({
    ...reactQueries.mutations.approve({
      assetId: poolAsset?.assetId,
      spender: poolAssetInboundAddress,
      amountCryptoBaseUnit: approvalAmountCryptoBaseUnit,
      wallet: wallet ?? undefined,
      from: poolAssetAccountId ? fromAccountId(poolAssetAccountId).account : undefined,
      accountNumber: poolAssetAccountNumber,
    }),
    onSuccess: (txHash: string) => {
      setApprovalTxId(txHash)

      if (!poolAsset || !poolAssetAccountId) return

      const amountCryptoPrecision = fromBaseUnit(approvalAmountCryptoBaseUnit, poolAsset.precision)

      dispatch(
        actionSlice.actions.upsertAction({
          id: txHash,
          type: ActionType.Approve,
          status: ActionStatus.Pending,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          transactionMetadata: {
            displayType: GenericTransactionDisplayType.Approve,
            txHash,
            chainId: poolAsset.chainId,
            accountId: poolAssetAccountId,
            amountCryptoPrecision,
            assetId: poolAsset.assetId,
            contractName: 'THORChain LP',
            message: 'actionCenter.approve.approvalTxPending',
          },
        }),
      )

      toast({
        id: txHash,
        duration: isDrawerOpen ? 5000 : null,
        status: 'success',
        render: ({ onClose, ...props }) => {
          const handleClick = () => {
            onClose()
            openActionCenter()
          }

          return (
            <GenericTransactionNotification
              handleClick={handleClick}
              actionId={txHash}
              onClose={onClose}
              {...props}
            />
          )
        },
      })
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
          poolAssetInboundAddress,
          poolAssetAccountAddress,
        ),
      )
    })()
  }, [
    approvalTx,
    poolAsset?.assetId,
    poolAssetInboundAddress,
    isApprovalTxPending,
    poolAssetAccountAddress,
    queryClient,
  ])

  // Pool asset fee/balance/sweep data and checks

  useEffect(() => {
    if (!estimatedPoolAssetFeesData) return
    setPoolAssetTxFeeCryptoBaseUnit(estimatedPoolAssetFeesData.txFeeCryptoBaseUnit)
  }, [estimatedPoolAssetFeesData])

  // Checks if there's enough pool asset balance for the transaction, excluding fees
  const hasEnoughPoolAssetBalanceForTx = useMemo(() => {
    if (!poolAsset) return false
    if (incompleteSide === AsymSide.Rune) return true

    const amountAvailableCryptoPrecision = fromBaseUnit(
      poolAssetBalanceCryptoBaseUnit,
      poolAsset.precision ?? 0,
    )

    return bnOrZero(actualAssetDepositAmountCryptoPrecision).lte(amountAvailableCryptoPrecision)
  }, [
    actualAssetDepositAmountCryptoPrecision,
    incompleteSide,
    poolAsset,
    poolAssetBalanceCryptoBaseUnit,
  ])

  const poolAssetTxFeeCryptoPrecision = useMemo(
    () => fromBaseUnit(poolAssetTxFeeCryptoBaseUnit ?? 0, poolAssetFeeAsset?.precision ?? 0),
    [poolAssetTxFeeCryptoBaseUnit, poolAssetFeeAsset?.precision],
  )

  // Checks if there's enough fee asset balance to cover the transaction fees
  const hasEnoughPoolAssetFeeAssetBalanceForTx = useMemo(() => {
    if (bnOrZero(actualAssetDepositAmountCryptoPrecision).isZero()) return true
    if (incompleteSide === AsymSide.Rune) return true

    if ((!isApprovalRequired && !poolAssetTxFeeCryptoBaseUnit) || !poolAsset) return false

    // If the asset is not a token, assume it's a native asset and fees are taken from the same asset balance
    if (!isToken(poolAsset.assetId)) {
      const assetAmountCryptoBaseUnit = toBaseUnit(
        actualAssetDepositAmountCryptoPrecision,
        poolAsset?.precision,
      )
      return bnOrZero(assetAmountCryptoBaseUnit)
        .plus(bnOrZero(poolAssetTxFeeCryptoBaseUnit))
        .lte(poolAssetBalanceCryptoBaseUnit)
    }

    // For tokens, check if the fee asset balance is enough to cover the fees - that's all we need, we don't need to account
    // for the asset itself in the calculation
    return bnOrZero(poolAssetTxFeeCryptoBaseUnit).lte(poolAssetFeeAssetBalanceCryptoBaseUnit)
  }, [
    actualAssetDepositAmountCryptoPrecision,
    incompleteSide,
    isApprovalRequired,
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
        hasEnoughPoolAssetBalanceForTxPlusFees,
    )
  }, [poolAsset, actualAssetDepositAmountCryptoPrecision, hasEnoughPoolAssetBalanceForTxPlusFees])

  const isSweepNeededArgs = useMemo(
    () => ({
      assetId: poolAsset?.assetId,
      address: poolAssetAccountAddress,
      amountCryptoBaseUnit: toBaseUnit(
        actualAssetDepositAmountCryptoPrecision ?? 0,
        poolAsset?.precision ?? 0,
      ),
      txFeeCryptoBaseUnit: poolAssetTxFeeCryptoBaseUnit,
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
    data: isSweepNeeded,
    isLoading: isSweepNeededLoading,
    isError: isSweepNeededError,
  } = useIsSweepNeededQuery(isSweepNeededArgs)

  // Rune balance / gas data and checks

  const {
    estimatedFeesData: estimatedRuneFeesData,
    isEstimatedFeesDataLoading: isEstimatedRuneFeesDataLoading,
    isEstimatedFeesDataError: isEstimatedRuneFeesDataError,
  } = useSendThorTx({
    assetId: thorchainAssetId,
    accountId: runeAccountId,
    amountCryptoBaseUnit: toBaseUnit(
      actualRuneDepositAmountCryptoPrecision,
      runeAsset?.precision ?? 0,
    ),
    memo: feeEstimationMemo,
    fromAddress: null,
    action: 'addLiquidity',
    enableEstimateFees: Boolean(
      bnOrZero(actualRuneDepositAmountCryptoPrecision).gt(0) && incompleteSide !== AsymSide.Asset,
    ),
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
    if (incompleteSide === AsymSide.Asset) return true

    const runeBalanceCryptoPrecision = fromBaseUnit(
      runeBalanceCryptoBaseUnit,
      runeAsset?.precision ?? 0,
    )

    return bnOrZero(actualRuneDepositAmountCryptoPrecision).lte(runeBalanceCryptoPrecision)
  }, [
    actualRuneDepositAmountCryptoPrecision,
    incompleteSide,
    runeAsset?.precision,
    runeBalanceCryptoBaseUnit,
  ])

  const hasEnoughRuneFeeBalanceForTx = useMemo(() => {
    if (incompleteSide === AsymSide.Asset) return true
    if (bnOrZero(actualRuneDepositAmountCryptoPrecision).isZero()) return true

    if (!runeAsset) return false
    if (!runeTxFeeCryptoBaseUnit) return false

    const runeAmountCryptoBaseUnit = toBaseUnit(
      actualRuneDepositAmountCryptoPrecision,
      runeAsset?.precision,
    )

    return bnOrZero(runeAmountCryptoBaseUnit)
      .plus(runeTxFeeCryptoBaseUnit)
      .lte(runeBalanceCryptoBaseUnit)
  }, [
    actualRuneDepositAmountCryptoPrecision,
    incompleteSide,
    runeAsset,
    runeBalanceCryptoBaseUnit,
    runeTxFeeCryptoBaseUnit,
  ])

  const poolAssetGasFeeFiatUserCurrency = useMemo(
    () =>
      bnOrZero(poolAssetTxFeeCryptoPrecision).times(bnOrZero(poolAssetFeeAssetMarktData?.price)),
    [poolAssetFeeAssetMarktData?.price, poolAssetTxFeeCryptoPrecision],
  )

  const runeGasFeeFiatUserCurrency = useMemo(
    () => bnOrZero(runeTxFeeCryptoPrecision).times(bnOrZero(runeMarketData?.price)),
    [runeMarketData?.price, runeTxFeeCryptoPrecision],
  )

  const totalGasFeeFiatUserCurrency = useMemo(() => {
    if (!opportunityType) return bn(0)

    switch (opportunityType) {
      case AsymSide.Rune:
        return runeGasFeeFiatUserCurrency
      case AsymSide.Asset:
        return poolAssetGasFeeFiatUserCurrency
      case 'sym': {
        if (!poolAssetTxFeeCryptoBaseUnit) return bn(0)
        if (!runeTxFeeCryptoBaseUnit) return bn(0)
        return poolAssetGasFeeFiatUserCurrency.plus(runeGasFeeFiatUserCurrency)
      }
      default:
        assertUnreachable(opportunityType)
    }
  }, [
    opportunityType,
    poolAssetGasFeeFiatUserCurrency,
    poolAssetTxFeeCryptoBaseUnit,
    runeGasFeeFiatUserCurrency,
    runeTxFeeCryptoBaseUnit,
  ])

  const handleApprove = useCallback(() => mutate(undefined), [mutate])

  const handleSubmit = useCallback(() => {
    if (!mixpanel) return
    if (!confirmedQuote) return
    if (isApprovalRequired) return handleApprove()
    if (isSweepNeeded) return navigate(AddLiquidityRoutePaths.Sweep)

    if (Boolean(incompleteSide)) {
      navigate(AddLiquidityRoutePaths.Status)
      mixpanel.track(MixPanelEvent.LpIncompleteDepositConfirm, confirmedQuote)
    } else {
      navigate(AddLiquidityRoutePaths.Confirm)
      mixpanel.track(MixPanelEvent.LpDepositPreview, confirmedQuote)
    }
  }, [
    confirmedQuote,
    handleApprove,
    navigate,
    isApprovalRequired,
    incompleteSide,
    isSweepNeeded,
    mixpanel,
  ])

  const runePerAsset = useMemo(() => pool?.assetPrice, [pool])

  const createHandleAddLiquidityInputChange = useCallback(
    (marketData: MarketData | undefined, isRune: boolean) => {
      return (value: string, isFiat?: boolean) => {
        if (!poolAsset) return

        const amountCryptoPrecision = (() => {
          if (!isFiat) return value
          if (!marketData) return

          return bnOrZero(value)
            .div(bn(marketData?.price))
            .toFixed()
        })()

        const amountFiatUserCurrency = (() => {
          if (isFiat) return value
          if (!marketData) return

          return bnOrZero(value)
            .times(bn(marketData?.price))
            .toFixed()
        })()

        if (isRune && bnOrZero(runePerAsset).isGreaterThan(0)) {
          setVirtualRuneDepositAmountCryptoPrecision(amountCryptoPrecision)
          setVirtualRuneDepositAmountFiatUserCurrency(amountFiatUserCurrency)
          setVirtualAssetDepositAmountFiatUserCurrency(amountFiatUserCurrency)
          setVirtualAssetDepositAmountCryptoPrecision(
            amountCryptoPrecision
              ? bnOrZero(amountCryptoPrecision).div(bnOrZero(runePerAsset)).toFixed()
              : '',
          )
        } else if (!isRune && bnOrZero(runePerAsset).isGreaterThan(0)) {
          setVirtualAssetDepositAmountCryptoPrecision(amountCryptoPrecision)
          setVirtualAssetDepositAmountFiatUserCurrency(amountFiatUserCurrency)
          setVirtualRuneDepositAmountFiatUserCurrency(amountFiatUserCurrency)
          setVirtualRuneDepositAmountCryptoPrecision(
            amountCryptoPrecision
              ? bnOrZero(amountCryptoPrecision).times(bnOrZero(runePerAsset)).toFixed()
              : '',
          )
        }
      }
    },
    [poolAsset, runePerAsset],
  )

  useEffect(() => {
    ;(async () => {
      if (!poolAsset) return
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

      setSlippageDecimalPercentage(estimate.slippageDecimalPercent)

      const _slippageFiatUserCurrency = bnOrZero(estimate.slippageRuneCryptoPrecision)
        .times(bnOrZero(runeMarketData?.price))
        .toFixed()

      setSlippageFiatUserCurrency(_slippageFiatUserCurrency)
      setIsSlippageLoading(false)
      setShareOfPoolDecimalPercent(estimate.poolShareDecimalPercent)
    })()
  }, [
    actualAssetDepositAmountCryptoPrecision,
    actualRuneDepositAmountCryptoPrecision,
    poolAsset,
    runeMarketData,
  ])

  useEffect(() => {
    if (!slippageFiatUserCurrency) return
    if (!activeOpportunityId) return
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

    const feeUsd = calculateFeeUsd({
      inputAmountUsd: totalAmountUsd,
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
      feeBps: DEFAULT_FEE_BPS.toString(),
      feeAmountFiatUserCurrency: feeUsd.times(userCurrencyToUsdRate).toFixed(2),
      feeAmountUSD: feeUsd.toFixed(2),
      assetAddress: poolAssetAccountAddress,
      runeGasFeeFiatUserCurrency: runeGasFeeFiatUserCurrency.toFixed(2),
      poolAssetGasFeeFiatUserCurrency: poolAssetGasFeeFiatUserCurrency.toFixed(2),
      totalGasFeeFiatUserCurrency: totalGasFeeFiatUserCurrency.toFixed(2),
      positionStatus: position?.status,
    })
  }, [
    activeOpportunityId,
    actualAssetDepositAmountCryptoPrecision,
    actualAssetDepositAmountFiatUserCurrency,
    actualRuneDepositAmountCryptoPrecision,
    actualRuneDepositAmountFiatUserCurrency,
    currentAccountIdByChainId,
    dispatch,
    isConnected,
    poolAssetAccountAddress,
    poolAssetGasFeeFiatUserCurrency,
    position,
    runeGasFeeFiatUserCurrency,
    setConfirmedQuote,
    shareOfPoolDecimalPercent,
    slippageFiatUserCurrency,
    totalGasFeeFiatUserCurrency,
    userCurrencyToUsdRate,
  ])

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

          const previousAssetId = previousOpportunityId
            ? fromOpportunityId(previousOpportunityId).assetId
            : undefined

          // Reset inputs on asset change
          if (assetId !== previousAssetId) {
            handleAddLiquidityInputChange('', false)
          }

          // Set amount required for completion of the incomplete sym position
          if (position?.status.incomplete?.asset.assetId === asset.assetId) {
            handleAddLiquidityInputChange(position.status.incomplete.amountCryptoPrecision, false)
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
              isReadOnly={Boolean(incompleteSide)}
              key={asset.assetId}
              assetId={asset?.assetId}
              assetIcon={asset?.icon ?? ''}
              assetSymbol={asset?.symbol ?? ''}
              onAccountIdChange={(accountId: AccountId) => {
                handleAccountIdChange(accountId, asset?.assetId)
              }}
              percentOptions={percentOptions}
              rightComponent={ReadOnlyAsset}
              formControlProps={formControlProps}
              onChange={handleAddLiquidityInputChange}
              onToggleIsFiat={handleToggleIsFiat}
              isFiat={isFiat}
              cryptoAmount={isNonEmptyString(cryptoAmount) ? cryptoAmount : '0'}
              fiatAmount={isNonEmptyString(fiatAmount) ? fiatAmount : '0'}
            />
          )
        })}
      </Stack>
    )
  }, [
    assetId,
    createHandleAddLiquidityInputChange,
    currentAccountIdByChainId,
    handleAccountIdChange,
    handleToggleIsFiat,
    incompleteSide,
    opportunityType,
    pairDivider,
    percentOptions,
    poolAsset,
    isFiat,
    poolAssetMarketData,
    position,
    previousOpportunityId,
    runeAsset,
    runeMarketData,
    virtualAssetDepositAmountCryptoPrecision,
    virtualAssetDepositAmountFiatUserCurrency,
    virtualRuneDepositAmountCryptoPrecision,
    virtualRuneDepositAmountFiatUserCurrency,
  ])

  const incompleteAlert = useMemo(() => {
    if (!position?.status.incomplete) return null

    return (
      <Alert status='info' mx={-2} width='auto'>
        <AlertIcon as={BiSolidBoltCircle} />
        <AlertDescription fontSize='sm' fontWeight='medium'>
          {translate('pools.incompletePositionDepositAlert', {
            asset: position.status.incomplete.asset.symbol,
          })}
        </AlertDescription>
      </Alert>
    )
  }, [position, translate])

  const maybeAlert = useMemo(() => {
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
    if (!isConnected) return null
    if (walletSupportsOpportunity) return null
    if (!poolAsset || !runeAsset) return null

    const translation = (() => {
      const poolAssetNetworkName =
        poolAsset.networkName ?? chainIdToChainDisplayName(poolAsset.chainId)
      const runeAssetNetworkName =
        runeAsset.networkName ?? chainIdToChainDisplayName(runeAsset.chainId)

      if (!walletSupportsRune && !walletSupportsAsset)
        return translate('pools.unsupportedNetworksExplainer', {
          network1: poolAssetNetworkName,
          network2: runeAssetNetworkName,
        })
      if (!walletSupportsRune)
        return translate('pools.unsupportedNetworkExplainer', { network: runeAssetNetworkName })
      if (!walletSupportsAsset)
        return translate('pools.unsupportedNetworkExplainer', { network: poolAssetNetworkName })
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
    isConnected,
    walletSupportsOpportunity,
    poolAsset,
    runeAsset,
    walletSupportsRune,
    walletSupportsAsset,
    translate,
  ])

  const handleAssetChange = useCallback(
    (asset: Asset) => {
      const type = getDefaultOpportunityType(asset.assetId)
      setPoolAssetTxFeeCryptoBaseUnit(undefined)
      setRuneTxFeeCryptoBaseUnit(undefined)
      setVirtualAssetDepositAmountCryptoPrecision('0')
      setVirtualAssetDepositAmountFiatUserCurrency('0')
      setVirtualRuneDepositAmountCryptoPrecision('0')
      setVirtualRuneDepositAmountFiatUserCurrency('0')
      setActiveOpportunityId(toOpportunityId({ assetId: asset.assetId, opportunityType: type }))
    },
    [getDefaultOpportunityType],
  )

  // We actually want unsupported assets to appear in this list ot match the main list of pools.
  const buyAssetSearch = useModal('buyAssetSearch')
  const handlePoolAssetClick = useCallback(() => {
    buyAssetSearch.open({
      onAssetClick: handleAssetChange,
      title: 'pools.pool',
      assets: poolAssets,
      allowWalletUnsupportedAssets: true,
    })
  }, [buyAssetSearch, handleAssetChange, poolAssets])

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
          onlyConnectedChains={false}
        />
        <TradeAssetSelect
          assetId={thorchainAssetId}
          isReadOnly
          isLoading={false}
          mb={0}
          buttonProps={buttonProps}
          onlyConnectedChains={false}
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
        toOpportunityId({
          assetId: poolAsset.assetId,
          opportunityType: asymSide as AsymSide | 'sym',
        }),
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

  const isStagedAsymDeposit = useMemo(
    () => pool?.status === 'staged' && opportunityType !== 'sym',
    [opportunityType, pool?.status],
  )

  const errorCopy = useMemo(() => {
    // Wallet not connected is *not* an error
    if (!isConnected) return
    // Order matters here. Since we're dealing with two assets potentially, we want to show the most relevant error message possible i.e
    // 1. chain halted
    // 2. cannot add single sided liquidity while a pool is staged
    // 3. pool halted/disabled
    // 4. Asset unsupported by wallet
    // 5. smart contract deposits disabled
    // 6. pool asset balance
    // 7. pool asset fee balance, since gas would usually be more expensive on the pool asset fee side vs. RUNE side
    // 8. RUNE balance
    // 9. RUNE fee balance
    // Not enough *pool* asset, but possibly enough *fee* asset
    if (isChainHalted) return translate('common.chainHalted')
    if (isStagedAsymDeposit) return translate('common.poolStaged')
    if (isTradingActive === false) return translate('common.poolHalted')
    if (!walletSupportsOpportunity) return translate('common.unsupportedNetwork')
    if (!isThorchainLpDepositFlagEnabled) return translate('common.poolDisabled')
    if (isThorchainLpDepositEnabledForPool === false) return translate('pools.depositsDisabled')
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
    isConnected,
    isSmartContractAccountAddress,
    isThorchainLpDepositFlagEnabled,
    isThorchainLpDepositEnabledForPool,
    isTradingActive,
    isChainHalted,
    notEnoughFeeAssetError,
    notEnoughPoolAssetError,
    notEnoughRuneError,
    notEnoughRuneFeeError,
    poolAsset,
    poolAssetFeeAsset,
    runeAsset,
    translate,
    walletSupportsOpportunity,
    isStagedAsymDeposit,
  ])

  const confirmCopy = useMemo(() => {
    if (!isConnected) return translate('common.connectWallet')
    if (errorCopy) return errorCopy
    if (poolAsset && isApprovalRequired)
      return translate(
        isAllowanceResetRequired
          ? 'trade.resetAllowance'
          : `transactionRow.parser.erc20.approveSymbol`,
        { symbol: poolAsset.symbol },
      )

    return translate('pools.addLiquidity')
  }, [errorCopy, isAllowanceResetRequired, isApprovalRequired, isConnected, poolAsset, translate])

  const divider = useMemo(() => <StackDivider borderColor='border.base' />, [])

  const renderHeader = useMemo(() => {
    if (headerComponent) return headerComponent
    return (
      <CardHeader display='flex' alignItems='center'>
        <Flex flex={1} justify='flex-start'>
          <IconButton
            onClick={handleBackClick}
            variant='ghost'
            icon={backIcon}
            aria-label='go back'
          />
        </Flex>
        <Flex flex={1} justify='center'>
          {translate('pools.addLiquidity')}
        </Flex>
        <Flex flex={1} justify='flex-end'>
          {/* Reserved space for future right-side content */}
        </Flex>
      </CardHeader>
    )
  }, [backIcon, handleBackClick, headerComponent, translate])

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

  const handleDepositSubmit = useCallback(() => {
    return isUnsafeQuote ? setShouldShowWarningAcknowledgement(true) : handleSubmit()
  }, [handleSubmit, isUnsafeQuote])

  const handleClick = useCallback(() => {
    thorchainMimirTimes?.liquidityLockupTime
      ? setShouldShowInfoAcknowledgement(true)
      : handleDepositSubmit()
  }, [thorchainMimirTimes, handleDepositSubmit])

  if (!poolAsset || !runeAsset) return null

  return (
    <SlideTransition>
      <InfoAcknowledgement
        message={translate('defi.liquidityLockupWarning', {
          time: formatSecondsToDuration(thorchainMimirTimes?.liquidityLockupTime ?? 0),
        })}
        onAcknowledge={handleDepositSubmit}
        shouldShowAcknowledgement={shouldShowInfoAcknowledgement}
        setShouldShowAcknowledgement={setShouldShowInfoAcknowledgement}
      />
      <WarningAcknowledgement
        message={translate('warningAcknowledgement.highSlippageDeposit', {
          slippagePercentage: bnOrZero(slippageDecimalPercentage).times(100).toFixed(2).toString(),
        })}
        onAcknowledge={handleSubmit}
        shouldShowAcknowledgement={shouldShowWarningAcknowledgement}
        setShouldShowAcknowledgement={setShouldShowWarningAcknowledgement}
      />
      {renderHeader}
      <Stack divider={divider} spacing={4} pb={4}>
        {pairSelect}
        <Stack>
          <FormLabel mb={0} px={6} fontSize='sm'>
            {translate('pools.depositAmounts')}
          </FormLabel>
          {!opportunityId && activeOpportunityId && (
            <LpType
              assetId={poolAsset.assetId}
              opportunityId={activeOpportunityId}
              onAsymSideChange={handleAsymSideChange}
              isDeposit={true}
              hasAsymRunePosition={hasAsymRunePosition}
              hasAsymAssetPosition={hasAsymAssetPosition}
              hasSymPosition={hasSymPosition}
              amountsByPosition={amountsByPosition}
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
            <Row.Value>
              <Flex alignItems='center' gap={2}>
                {bnOrZero(confirmedQuote?.feeAmountFiatUserCurrency).gt(0) ? (
                  <>
                    <Amount.Fiat value={confirmedQuote?.feeAmountFiatUserCurrency ?? 0} />
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
        {incompleteAlert}
        {maybeOpportunityNotSupportedExplainer}
        {maybeAlert}
        <ButtonWalletPredicate
          isValidWallet={Boolean(walletSupportsOpportunity)}
          mx={-2}
          size='lg'
          colorScheme={errorCopy ? 'red' : 'blue'}
          isDisabled={Boolean(
            isStagedAsymDeposit ||
              disabledSymDepositAfterRune ||
              isTradingActive === false ||
              isChainHalted ||
              !isThorchainLpDepositEnabled ||
              !confirmedQuote ||
              !hasEnoughAssetBalance ||
              !hasEnoughRuneBalance ||
              isApprovalTxPending ||
              (isSweepNeededEnabled && isSweepNeeded === undefined && !isApprovalRequired) ||
              isSweepNeededError ||
              isEstimatedPoolAssetFeesDataError ||
              isEstimatedRuneFeesDataError ||
              isSmartContractAccountAddress ||
              bnOrZero(actualAssetDepositAmountCryptoPrecision)
                .plus(bnOrZero(actualRuneDepositAmountCryptoPrecision))
                .isZero() ||
              notEnoughFeeAssetError ||
              notEnoughRuneFeeError,
          )}
          isLoading={
            (poolAssetTxFeeCryptoBaseUnit === undefined && isEstimatedPoolAssetFeesDataLoading) ||
            isTradingActiveLoading ||
            isChainHaltedFetching ||
            isSmartContractAccountAddressLoading ||
            isApprovalRequirementsLoading ||
            isApprovalTxPending ||
            (isSweepNeeded === undefined && isSweepNeededLoading && !isApprovalRequired) ||
            (runeTxFeeCryptoBaseUnit === undefined && isEstimatedPoolAssetFeesDataLoading) ||
            isThorchainMimirTimesLoading
          }
          onClick={handleClick}
        >
          {confirmCopy}
        </ButtonWalletPredicate>
      </CardFooter>
    </SlideTransition>
  )
}
