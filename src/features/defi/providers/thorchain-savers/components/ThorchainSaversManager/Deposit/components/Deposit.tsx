import { Skeleton, useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId, thorchainAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useQueryClient } from '@tanstack/react-query'
import { getOrCreateContractByType } from 'contracts/contractManager'
import { ContractType } from 'contracts/types'
import type { DepositValues } from 'features/defi/components/Deposit/Deposit'
import { Deposit as ReusableDeposit } from 'features/defi/components/Deposit/Deposit'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import debounce from 'lodash/debounce'
import pDebounce from 'p-debounce'
import qs from 'qs'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { encodeFunctionData, getAddress, maxUint256 } from 'viem'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { Amount } from 'components/Amount/Amount'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { useIsApprovalRequired } from 'hooks/queries/useIsApprovalRequired'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { isToken } from 'lib/utils'
import { assertGetEvmChainAdapter, getFeesWithWalletEIP1559Support } from 'lib/utils/evm'
import { fetchHasEnoughBalanceForTxPlusFeesPlusSweep } from 'lib/utils/thorchain/balance'
import { BASE_BPS_POINTS, RUNEPOOL_DEPOSIT_MEMO } from 'lib/utils/thorchain/constants'
import { useGetThorchainSaversDepositQuoteQuery } from 'lib/utils/thorchain/hooks/useGetThorchainSaversDepositQuoteQuery'
import { useSendThorTx } from 'lib/utils/thorchain/hooks/useSendThorTx'
import { isUtxoChainId } from 'lib/utils/utxo'
import type { EstimatedFeesQueryKey } from 'pages/Lending/hooks/useGetEstimatedFeesQuery'
import { queryFn as getEstimatedFeesQueryFn } from 'pages/Lending/hooks/useGetEstimatedFeesQuery'
import type { IsSweepNeededQueryKey } from 'pages/Lending/hooks/useIsSweepNeededQuery'
import {
  getIsSweepNeeded,
  isGetSweepNeededInput,
  useIsSweepNeededQuery,
} from 'pages/Lending/hooks/useIsSweepNeededQuery'
import {
  isAboveDepositDustThreshold,
  makeDaysToBreakEven,
  THORCHAIN_SAVERS_DUST_THRESHOLDS_CRYPTO_BASE_UNIT,
} from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectFeeAssetById,
  selectHighestStakingBalanceAccountIdByStakingId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ThorchainSaversDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

type DepositProps = StepComponentProps & {
  accountId?: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
  fromAddress: string | undefined
}

const percentOptions = [0.25, 0.5, 0.75, 1]

export const Deposit: React.FC<DepositProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
  fromAddress,
  onNext,
}) => {
  // Redeclared here as state field because of chicken-and-egg issues
  const [isApprovalRequired, setIsApprovalRequired] = useState<boolean | undefined>(false)
  const { state, dispatch: contextDispatch } = useContext(DepositContext)

  const toast = useToast()
  const queryClient = useQueryClient()
  const history = useHistory()
  const translate = useTranslate()
  const [slippageCryptoAmountPrecision, setSlippageCryptoAmountPrecision] = useState<string | null>(
    null,
  )
  const [daysToBreakEven, setDaysToBreakEven] = useState<string | null>(null)
  const [inputValues, setInputValues] = useState<{
    fiatAmount: string
    cryptoAmount: string
  } | null>(null)
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query
  const assets = useAppSelector(selectAssets)

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const isRunePool = assetId === thorchainAssetId

  const isTokenDeposit = isToken(assetId)

  const accountNumberFilter = useMemo(() => ({ accountId }), [accountId])
  const accountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, accountNumberFilter),
  )

  const {
    state: { wallet },
  } = useWallet()

  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId))
  const opportunityId = useMemo(
    () => (assetId ? toOpportunityId({ chainId, assetNamespace, assetReference }) : undefined),
    [assetId, assetNamespace, assetReference, chainId],
  )
  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: opportunityId }),
    [opportunityId],
  )
  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestStakingBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )
  const opportunityDataFilter = useMemo(
    () => ({
      userStakingId: serializeUserStakingId(
        accountId ?? highestBalanceAccountId ?? '',
        opportunityId ?? '',
      ),
    }),
    [accountId, highestBalanceAccountId, opportunityId],
  )

  const opportunityData = useAppSelector(state =>
    selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter),
  )

  const asset: Asset | undefined = useAppSelector(state => selectAssetById(state, assetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)

  const assetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId),
  )
  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )

  const assetPriceInFeeAsset = useMemo(() => {
    return bn(assetMarketData.price).div(feeAssetMarketData.price)
  }, [assetMarketData.price, feeAssetMarketData.price])

  const userAddress: string | undefined = accountId && fromAccountId(accountId).account
  const balanceFilter = useMemo(() => ({ assetId, accountId }), [accountId, assetId])
  // user info
  const balanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, balanceFilter),
  )

  const {
    data: thorchainSaversDepositQuote,
    isLoading: isThorchainSaversDepositQuoteLoading,
    isSuccess: isThorchainSaversDepositQuoteSuccess,
    isError: isThorchainSaversDepositQuoteError,
    error: thorchainSaversDepositQuoteError,
  } = useGetThorchainSaversDepositQuoteQuery({
    asset,
    amountCryptoBaseUnit: toBaseUnit(inputValues?.cryptoAmount, asset.precision),
    enabled: !isRunePool,
  })

  const memo = useMemo(() => {
    if (isRunePool) return RUNEPOOL_DEPOSIT_MEMO

    if (thorchainSaversDepositQuote?.memo) return thorchainSaversDepositQuote?.memo

    return null
  }, [isRunePool, thorchainSaversDepositQuote?.memo])

  const {
    estimatedFeesData,
    isEstimatedFeesDataLoading,
    outboundFeeCryptoBaseUnit,
    inboundAddress,
  } = useSendThorTx({
    assetId,
    accountId: accountId ?? null,
    amountCryptoBaseUnit: toBaseUnit(inputValues?.cryptoAmount, asset?.precision ?? 0),
    memo,
    fromAddress: fromAddress ?? null,
    action: isRunePool ? 'depositRunepool' : 'depositSavers',
    enableEstimateFees: Boolean(!isApprovalRequired && bnOrZero(inputValues?.cryptoAmount).gt(0)),
  })

  const { isAllowanceResetRequired, isApprovalRequired: _isApprovalRequired } =
    useIsApprovalRequired({
      assetId,
      // TODO(gomes): consolidate
      amountCryptoBaseUnit: toBaseUnit(inputValues?.cryptoAmount, asset?.precision ?? 0),
      spender: inboundAddress,
      from: accountId ? fromAccountId(accountId).account : undefined,
    })

  useEffect(() => {
    setIsApprovalRequired(_isApprovalRequired)
  }, [_isApprovalRequired, setIsApprovalRequired])

  // TODO(gomes): this will work for UTXO but is invalid for tokens since they use diff. denoms
  // the current workaround is to not do fee deduction for non-UTXO chains,
  // but for consistency, we should for native EVM assets, and ensure this is a no-op for tokens
  // Note when implementing this, fee checks/deduction will need to either be done for *native* assets only
  // or handle different denoms for tokens/native assets and display insufficientFundsForProtocolFee copy
  const getHasEnoughBalanceForTxPlusFees = useCallback(
    ({
      balanceCryptoBaseUnit,
      amountCryptoPrecision,
      txFeeCryptoBaseUnit,
      precision,
    }: {
      balanceCryptoBaseUnit: string
      amountCryptoPrecision: string
      txFeeCryptoBaseUnit: string
      precision: number
    }) => {
      const balanceCryptoBaseUnitBn = bnOrZero(balanceCryptoBaseUnit)
      if (balanceCryptoBaseUnitBn.isZero()) return false

      return bnOrZero(amountCryptoPrecision)
        .plus(fromBaseUnit(txFeeCryptoBaseUnit, precision ?? 0))
        .lte(fromBaseUnit(balanceCryptoBaseUnitBn, precision))
    },
    [],
  )

  const isSweepNeededArgs = useMemo(
    () => ({
      assetId,
      address: fromAddress,
      amountCryptoBaseUnit: toBaseUnit(inputValues?.cryptoAmount ?? 0, feeAsset?.precision ?? 0),
      txFeeCryptoBaseUnit: estimatedFeesData?.txFeeCryptoBaseUnit,
      // Don't fetch sweep needed if there isn't enough balance for the tx + fees, since adding in a sweep Tx would obviously fail too
      enabled: Boolean(
        bnOrZero(inputValues?.cryptoAmount).gt(0) &&
          estimatedFeesData &&
          getHasEnoughBalanceForTxPlusFees({
            precision: asset.precision,
            balanceCryptoBaseUnit,
            amountCryptoPrecision: inputValues?.cryptoAmount ?? '',
            txFeeCryptoBaseUnit: estimatedFeesData.txFeeCryptoBaseUnit,
          }),
      ),
    }),
    [
      asset.precision,
      assetId,
      balanceCryptoBaseUnit,
      estimatedFeesData,
      feeAsset?.precision,
      fromAddress,
      getHasEnoughBalanceForTxPlusFees,
      inputValues?.cryptoAmount,
    ],
  )

  const { data: isSweepNeeded, isLoading: isSweepNeededLoading } =
    useIsSweepNeededQuery(isSweepNeededArgs)

  const handleContinue = useCallback(
    async (formValues: DepositValues) => {
      if (!feeAsset) return
      if (!accountId) return
      if (!userAddress) return
      if (!inputValues) return
      if (!opportunityData) return
      if (!contextDispatch) return
      if (!isApprovalRequired && !estimatedFeesData) return

      // set deposit state for future use
      contextDispatch({ type: ThorchainSaversDepositActionType.SET_DEPOSIT, payload: formValues })
      contextDispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: true })

      try {
        if (estimatedFeesData) {
          contextDispatch({
            type: ThorchainSaversDepositActionType.SET_DEPOSIT,
            payload: {
              estimatedGasCryptoPrecision: fromBaseUnit(
                estimatedFeesData.txFeeCryptoBaseUnit,
                feeAsset.precision,
              ),
              networkFeeCryptoBaseUnit: estimatedFeesData.txFeeCryptoBaseUnit,
            },
          })
        }

        const approvalFees = await (() => {
          if (
            !(isApprovalRequired || isAllowanceResetRequired) ||
            !inboundAddress ||
            accountNumber === undefined ||
            !wallet
          )
            return undefined

          const contract = getOrCreateContractByType({
            address: fromAssetId(assetId).assetReference,
            type: ContractType.ERC20,
            chainId: asset.chainId,
          })
          if (!contract) return undefined

          const data = encodeFunctionData({
            abi: contract.abi,
            functionName: 'approve',
            args: [getAddress(inboundAddress), isAllowanceResetRequired ? 0n : maxUint256],
          })

          const adapter = assertGetEvmChainAdapter(chainId)

          return getFeesWithWalletEIP1559Support({
            adapter,
            data,
            to: fromAssetId(assetId).assetReference,
            from: userAddress,
            value: '0',
            wallet,
          })
        })()
        if (approvalFees) {
          contextDispatch({
            type: ThorchainSaversDepositActionType.SET_APPROVE,
            payload: {
              estimatedGasCryptoPrecision: fromBaseUnit(
                approvalFees.networkFeeCryptoBaseUnit,
                feeAsset.precision,
              ),
            },
          })

          onNext(isAllowanceResetRequired ? DefiStep.AllowanceReset : DefiStep.Approve)
          return
        }
        onNext(isSweepNeeded ? DefiStep.Sweep : DefiStep.Confirm)
        trackOpportunityEvent(
          MixPanelEvent.DepositContinue,
          {
            opportunity: opportunityData,
            fiatAmounts: [formValues.fiatAmount],
            cryptoAmounts: [{ assetId, amountCryptoHuman: formValues.cryptoAmount }],
          },
          assets,
        )
      } catch (error) {
        console.error(error)
        toast({
          position: 'top-right',
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
        contextDispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: false })
      } finally {
        contextDispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: false })
      }
    },
    [
      feeAsset,
      accountId,
      userAddress,
      inputValues,
      opportunityData,
      contextDispatch,
      isApprovalRequired,
      estimatedFeesData,
      onNext,
      isSweepNeeded,
      assetId,
      assets,
      isAllowanceResetRequired,
      inboundAddress,
      accountNumber,
      wallet,
      asset.chainId,
      chainId,
      toast,
      translate,
    ],
  )

  const handleCancel = useCallback(() => {
    browserHistory.goBack()
  }, [browserHistory])

  const outboundFeeInAssetCryptoBaseUnit = useMemo(() => {
    if (!asset) return bn(0)
    if (!feeAsset) return bn(0)
    if (!outboundFeeCryptoBaseUnit) return bn(0)

    const outboundFeeCryptoPrecision = fromBaseUnit(outboundFeeCryptoBaseUnit, feeAsset.precision)
    const outboundFeeInAssetCryptoPrecision = bn(outboundFeeCryptoPrecision).div(
      assetPriceInFeeAsset,
    )

    return toBaseUnit(outboundFeeInAssetCryptoPrecision, asset.precision)
  }, [outboundFeeCryptoBaseUnit, assetPriceInFeeAsset, asset, feeAsset])

  const _validateCryptoAmount = useCallback(
    async (value: string) => {
      if (!accountId) return
      if (state?.loading) return

      const valueCryptoBaseUnit = toBaseUnit(value, asset.precision)
      const balanceCryptoPrecision = bn(fromBaseUnit(balanceCryptoBaseUnit, asset.precision))

      if (balanceCryptoPrecision.isZero() || balanceCryptoPrecision.lt(value))
        return 'common.insufficientFunds'

      const valueCryptoPrecision = bnOrZero(value)
      if (valueCryptoPrecision.isEqualTo(0)) return ''

      const isBelowMinSellAmount = !isAboveDepositDustThreshold({ valueCryptoBaseUnit, assetId })
      const isBelowOutboundFee =
        bn(outboundFeeInAssetCryptoBaseUnit).gt(0) &&
        bnOrZero(valueCryptoBaseUnit).lt(outboundFeeInAssetCryptoBaseUnit)

      const minLimitCryptoPrecision = fromBaseUnit(
        THORCHAIN_SAVERS_DUST_THRESHOLDS_CRYPTO_BASE_UNIT[assetId],
        asset.precision,
      )
      const outboundFeeCryptoPrecision = fromBaseUnit(
        outboundFeeInAssetCryptoBaseUnit,
        asset.precision,
      )
      const minLimit = `${minLimitCryptoPrecision} ${asset.symbol}`
      const outboundFeeLimit = `${outboundFeeCryptoPrecision} ${asset.symbol}`

      if (isBelowMinSellAmount) return translate('trade.errors.amountTooSmall', { minLimit })
      if (isBelowOutboundFee)
        return translate('trade.errors.amountTooSmall', { minLimit: outboundFeeLimit })

      const hasEnoughBalance = await (async () => {
        // Only check for sweep + fees at this stage for UTXOs because of reconciliation - this is *not* required for EVM chains
        // Since we already do basic balance checks earlier, we already know that the user has enough balance for the Tx,
        // but potentially not for fees, which will be checked at confirm step
        if (!isUtxoChainId(chainId)) return true

        const { hasEnoughBalance: _hasEnoughBalance } =
          await fetchHasEnoughBalanceForTxPlusFeesPlusSweep({
            amountCryptoPrecision: value,
            accountId,
            asset,
            type: 'deposit',
            fromAddress,
          })

        return _hasEnoughBalance
      })()

      return hasEnoughBalance || 'common.insufficientFunds'
    },
    [
      accountId,
      state?.loading,
      asset,
      balanceCryptoBaseUnit,
      assetId,
      outboundFeeInAssetCryptoBaseUnit,
      translate,
      chainId,
      fromAddress,
    ],
  )

  const validateCryptoAmount = useCallback(
    (value: string) => {
      if (!contextDispatch) return

      contextDispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: true })
      return _validateCryptoAmount(value).finally(() => {
        contextDispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: false })
      })
    },
    [_validateCryptoAmount, contextDispatch],
  )

  const validateCryptoAmountDebounced = useMemo(
    () => pDebounce(validateCryptoAmount, 500),
    [validateCryptoAmount],
  )

  const _validateFiatAmount = useCallback(
    async (value: string) => {
      if (!accountId) return
      if (state?.loading) return
      const valueCryptoPrecision = bnOrZero(value).div(assetMarketData.price)
      const balanceCryptoPrecision = bn(fromBaseUnit(balanceCryptoBaseUnit, asset.precision))

      const fiatBalance = balanceCryptoPrecision.times(assetMarketData.price)
      if (fiatBalance.isZero() || fiatBalance.lt(value)) return 'common.insufficientFunds'

      const valueCryptoBaseUnit = toBaseUnit(valueCryptoPrecision, asset.precision)

      const isBelowMinSellAmount = !isAboveDepositDustThreshold({ valueCryptoBaseUnit, assetId })
      const isBelowOutboundFee =
        bn(outboundFeeInAssetCryptoBaseUnit).gt(0) &&
        bnOrZero(valueCryptoBaseUnit).lt(outboundFeeInAssetCryptoBaseUnit)

      const minLimitCryptoPrecision = fromBaseUnit(
        THORCHAIN_SAVERS_DUST_THRESHOLDS_CRYPTO_BASE_UNIT[assetId],
        asset.precision,
      )
      const outboundFeeCryptoPrecision = fromBaseUnit(
        outboundFeeInAssetCryptoBaseUnit,
        asset.precision,
      )
      const minLimit = `${minLimitCryptoPrecision} ${asset.symbol}`
      const outboundFeeLimit = `${outboundFeeCryptoPrecision} ${asset.symbol}`

      if (isBelowMinSellAmount) return translate('trade.errors.amountTooSmall', { minLimit })
      if (isBelowOutboundFee)
        return translate('trade.errors.amountTooSmall', { minLimit: outboundFeeLimit })

      const hasEnoughBalance = await (async () => {
        // Only check for sweep + fees at this stage for UTXOs because of reconciliation - this is *not* required for EVM chains
        // Since we already do basic balance checks earlier, we already know that the user has enough balance for the Tx,
        // but potentially not for fees, which will be checked at confirm step
        if (!isUtxoChainId(chainId)) return true

        const { hasEnoughBalance: _hasEnoughBalance } =
          await fetchHasEnoughBalanceForTxPlusFeesPlusSweep({
            amountCryptoPrecision: valueCryptoPrecision.toFixed(),
            accountId,
            asset,
            type: 'deposit',
            fromAddress,
          })

        return _hasEnoughBalance
      })()

      return hasEnoughBalance || 'common.insufficientFunds'
    },
    [
      accountId,
      state?.loading,
      assetMarketData.price,
      balanceCryptoBaseUnit,
      asset,
      assetId,
      outboundFeeInAssetCryptoBaseUnit,
      translate,
      chainId,
      fromAddress,
    ],
  )

  const validateFiatAmount = useCallback(
    (value: string) => {
      if (!contextDispatch) return

      contextDispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: true })
      return _validateFiatAmount(value).finally(() => {
        contextDispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: false })
      })
    },
    [_validateFiatAmount, contextDispatch],
  )

  const validateFiatAmountDebounced = useMemo(
    () => pDebounce(validateFiatAmount, 500),
    [validateFiatAmount],
  )

  const balanceCryptoPrecision = useMemo(
    () => bn(fromBaseUnit(balanceCryptoBaseUnit, asset.precision)),
    [balanceCryptoBaseUnit, asset?.precision],
  )
  const fiatAmountAvailable = useMemo(
    () => bnOrZero(balanceCryptoPrecision).times(assetMarketData.price),
    [balanceCryptoPrecision, assetMarketData?.price],
  )

  const setIsSendMax = useCallback(
    (isSendMax?: boolean) => {
      if (!contextDispatch) return

      contextDispatch({
        type: ThorchainSaversDepositActionType.SET_DEPOSIT,
        payload: { sendMax: Boolean(isSendMax) },
      })
    },
    [contextDispatch],
  )
  const handlePercentClick = useCallback(
    async (_percent: number) => {
      // Arbitrary buffer on UTXO max sends to account for possible UTXO set discrepancies
      const percent = isUtxoChainId(asset.chainId) && _percent === 1 ? 0.99 : _percent

      if (!contextDispatch) return { percentageCryptoAmount: '0', percentageFiatAmount: '0' }
      contextDispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: true })
      setIsSendMax(percent === 1)

      const _percentageCryptoAmountPrecisionBeforeTxFees = bnOrZero(balanceCryptoPrecision)
        .times(percent)
        .dp(asset.precision)

      const estimateFeesQueryEnabled = Boolean(
        fromAddress && accountId && isUtxoChainId(asset.chainId),
      )
      const estimatedFeesQueryArgs = {
        estimateFeesInput: {
          amountCryptoPrecision: _percentageCryptoAmountPrecisionBeforeTxFees.toFixed(),
          // The same as assetId since this only runs for UTXOs
          feeAssetId: assetId,
          assetId,
          to: fromAddress ?? '',
          sendMax: false,
          accountId: accountId ?? '',
          contractAddress: undefined,
        },
        feeAsset,
        feeAssetMarketData,
        enabled: Boolean(accountId && feeAsset?.assetId && isUtxoChainId(asset.chainId)),
      }
      const estimatedFeesQueryKey: EstimatedFeesQueryKey = ['estimateFees', estimatedFeesQueryArgs]

      const _estimatedFeesData = estimateFeesQueryEnabled
        ? await queryClient.fetchQuery({
            queryKey: estimatedFeesQueryKey,
            queryFn: getEstimatedFeesQueryFn,
          })
        : undefined

      const isSweepNeededQueryEnabled = Boolean(
        _percentageCryptoAmountPrecisionBeforeTxFees.gt(0) && _estimatedFeesData,
      )

      const isSweepNeededQueryArgs = {
        assetId,
        address: fromAddress,
        // Assume 0 fees, so that sweep needed properly return true/false
        // The reason this works is because the final amount we're getting *is* fee-deducted, so we don't want to consider fees in this specific call
        txFeeCryptoBaseUnit: '0',
        amountCryptoBaseUnit: toBaseUnit(
          _percentageCryptoAmountPrecisionBeforeTxFees,
          asset.precision,
        ),
      }

      const isSweepNeededQueryKey: IsSweepNeededQueryKey = ['isSweepNeeded', isSweepNeededQueryArgs]
      const _isSweepNeeded =
        isSweepNeededQueryEnabled && isGetSweepNeededInput(isSweepNeededQueryArgs)
          ? await queryClient.fetchQuery({
              queryKey: isSweepNeededQueryKey,
              queryFn: () => getIsSweepNeeded(isSweepNeededQueryArgs),
            })
          : undefined

      const isEstimateSweepFeesQueryEnabled = Boolean(
        _isSweepNeeded && accountId && isUtxoChainId(asset.chainId),
      )
      const estimatedSweepFeesQueryArgs = {
        feeAsset,
        feeAssetMarketData,
        estimateFeesInput: {
          amountCryptoPrecision: '0',
          assetId,
          // The same as assetId since this only runs for UTXOs
          feeAssetId: assetId,
          to: fromAddress ?? '',
          sendMax: true,
          accountId: accountId ?? '',
          contractAddress: undefined,
        },
        enabled: isEstimateSweepFeesQueryEnabled,
      }
      const estimatedSweepFeesQueryKey: EstimatedFeesQueryKey = [
        'estimateFees',
        estimatedSweepFeesQueryArgs,
      ]
      const _estimatedSweepFeesData = isEstimateSweepFeesQueryEnabled
        ? await queryClient.fetchQuery({
            queryKey: estimatedSweepFeesQueryKey,
            queryFn: getEstimatedFeesQueryFn,
          })
        : undefined

      const _percentageCryptoAmountPrecisionAfterTxFeesAndSweep =
        _percentageCryptoAmountPrecisionBeforeTxFees
          .minus(fromBaseUnit(_estimatedFeesData?.txFeeCryptoBaseUnit ?? 0, asset.precision))
          .minus(fromBaseUnit(_estimatedSweepFeesData?.txFeeCryptoBaseUnit ?? 0, asset.precision))

      const _percentageFiatAmount = _percentageCryptoAmountPrecisionAfterTxFeesAndSweep.times(
        assetMarketData.price,
      )
      contextDispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: false })
      return {
        percentageCryptoAmount: _percentageCryptoAmountPrecisionAfterTxFeesAndSweep.toFixed(),
        percentageFiatAmount: _percentageFiatAmount.toFixed(),
      }
    },
    [
      asset.chainId,
      asset.precision,
      contextDispatch,
      setIsSendMax,
      balanceCryptoPrecision,
      fromAddress,
      accountId,
      assetId,
      feeAsset,
      feeAssetMarketData,
      queryClient,
      assetMarketData.price,
    ],
  )

  useEffect(() => {
    if (isThorchainSaversDepositQuoteLoading) return
    if (!opportunityData?.apy) return
    if (!(accountId && inputValues && asset && feeAsset)) return
    const { cryptoAmount } = inputValues
    const amountCryptoBaseUnit = toBaseUnit(cryptoAmount, asset.precision)

    if (bn(amountCryptoBaseUnit).isZero()) return

    // TODO(gomes): we should now be able to return these from the query itself to make things cleaner
    const debounced = debounce(() => {
      if (isThorchainSaversDepositQuoteError)
        throw new Error(thorchainSaversDepositQuoteError.message)
      if (!opportunityData.apy) return

      const quote = thorchainSaversDepositQuote

      if (!quote) return

      const {
        fees: { slippage_bps },
        expected_amount_deposit: expectedAmountOutThorBaseUnit,
      } = quote

      const slippagePercentage = bnOrZero(slippage_bps).div(BASE_BPS_POINTS).times(100)
      // slippage going into position - 0.007 ETH for 5 ETH deposit
      // This is NOT the same as the total THOR fees, which include the deposit fee in addition to the slippage
      const cryptoSlippageAmountPrecision = bnOrZero(cryptoAmount)
        .times(slippagePercentage)
        .div(100)
      setSlippageCryptoAmountPrecision(cryptoSlippageAmountPrecision.toString())

      // daily upside
      const daysToBreakEven = makeDaysToBreakEven({
        expectedAmountOutThorBaseUnit,
        amountCryptoBaseUnit,
        asset,
        apy: opportunityData.apy,
      })
      setDaysToBreakEven(daysToBreakEven)
    })

    debounced()

    // cancel the previous debounce when inputValues changes to avoid race conditions
    // and always ensure the latest value is used
    return debounced.cancel
  }, [
    accountId,
    asset,
    feeAsset,
    inputValues,
    isThorchainSaversDepositQuoteError,
    isThorchainSaversDepositQuoteLoading,
    isTokenDeposit,
    opportunityData?.apy,
    thorchainSaversDepositQuote,
    thorchainSaversDepositQuoteError?.message,
  ])

  const handleInputChange = useCallback(
    ({ fiatAmount, cryptoAmount }: { fiatAmount: string; cryptoAmount: string }) => {
      setInputValues({ fiatAmount, cryptoAmount })
    },
    [],
  )

  const handleBack = useCallback(() => {
    history.push({
      pathname: `/defi/earn`,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }, [history, query])

  const cryptoInputValidation = useMemo(
    () => ({
      required: true,
      validate: { validateCryptoAmountDebounced },
    }),
    [validateCryptoAmountDebounced],
  )

  const fiatInputValidation = useMemo(
    () => ({
      required: true,
      validate: { validateFiatAmountDebounced },
    }),
    [validateFiatAmountDebounced],
  )

  if (!state || !contextDispatch || !opportunityData) return null

  return (
    <ReusableDeposit
      accountId={accountId}
      onAccountIdChange={handleAccountIdChange}
      asset={asset}
      apy={opportunityData.apy ?? undefined}
      cryptoAmountAvailable={balanceCryptoPrecision.toPrecision()}
      cryptoInputValidation={cryptoInputValidation}
      fiatAmountAvailable={fiatAmountAvailable.toFixed(2)}
      fiatInputValidation={fiatInputValidation}
      marketData={assetMarketData}
      onCancel={handleCancel}
      onPercentClick={handlePercentClick}
      onContinue={handleContinue}
      onBack={handleBack}
      onChange={handleInputChange}
      percentOptions={percentOptions}
      enableSlippage={false}
      isLoading={
        isEstimatedFeesDataLoading ||
        isSweepNeededLoading ||
        isThorchainSaversDepositQuoteLoading ||
        state.loading
      }
    >
      {!isRunePool ? (
        <>
          <Row>
            <Row.Label>{translate('common.slippage')}</Row.Label>
            <Row.Value>
              <Skeleton isLoaded={isThorchainSaversDepositQuoteSuccess}>
                <Amount.Crypto value={slippageCryptoAmountPrecision ?? ''} symbol={asset.symbol} />
              </Skeleton>
            </Row.Value>
          </Row>
          <Row>
            <Row.Label>
              <HelperTooltip label={translate('defi.modals.saversVaults.timeToBreakEven.tooltip')}>
                {translate('defi.modals.saversVaults.timeToBreakEven.title')}
              </HelperTooltip>
            </Row.Label>
            <Row.Value>
              <Skeleton isLoaded={isThorchainSaversDepositQuoteSuccess}>
                {translate(
                  `defi.modals.saversVaults.${bnOrZero(daysToBreakEven).eq(1) ? 'day' : 'days'}`,
                  { amount: daysToBreakEven ?? '0' },
                )}
              </Skeleton>
            </Row.Value>
          </Row>
        </>
      ) : null}
    </ReusableDeposit>
  )
}
