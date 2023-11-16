import { Skeleton, useToast } from '@chakra-ui/react'
import { MaxUint256 } from '@ethersproject/constants'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { type FeeDataEstimate } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads/build'
import { Ok } from '@sniptt/monads/build'
import { useQueryClient } from '@tanstack/react-query'
import { getConfig } from 'config'
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
import qs from 'qs'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { encodeFunctionData, getAddress } from 'viem'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { Amount } from 'components/Amount/Amount'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { estimateFees } from 'components/Modals/Send/utils'
import { Row } from 'components/Row/Row'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { getSupportedEvmChainIds } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { getInboundAddressDataForChain } from 'lib/swapper/swappers/ThorchainSwapper/utils/getInboundAddressDataForChain'
import { useRouterContractAddress } from 'lib/swapper/swappers/ThorchainSwapper/utils/useRouterContractAddress'
import type { SwapErrorRight } from 'lib/swapper/types'
import { isToken } from 'lib/utils'
import {
  assertGetEvmChainAdapter,
  createBuildCustomTxInput,
  getErc20Allowance,
  getFees,
} from 'lib/utils/evm'
import type { GetThorchainSaversDepositQuoteQueryKey } from 'lib/utils/thorchain/hooks/useGetThorchainSaversDepositQuoteQuery'
import {
  queryFn as getThorchainSaversDepositQuoteQueryFn,
  useGetThorchainSaversDepositQuoteQuery,
} from 'lib/utils/thorchain/hooks/useGetThorchainSaversDepositQuoteQuery'
import type { EstimatedFeesQueryKey } from 'pages/Lending/hooks/useGetEstimatedFeesQuery'
import {
  queryFn as getEstimatedFeesQueryFn,
  useGetEstimatedFeesQuery,
} from 'pages/Lending/hooks/useGetEstimatedFeesQuery'
import type { IsSweepNeededQueryKey } from 'pages/Lending/hooks/useIsSweepNeededQuery'
import {
  queryFn as isSweepNeededQueryFn,
  useIsSweepNeededQuery,
} from 'pages/Lending/hooks/useIsSweepNeededQuery'
import {
  BASE_BPS_POINTS,
  fromThorBaseUnit,
  isAboveDepositDustThreshold,
  makeDaysToBreakEven,
  THORCHAIN_SAVERS_DUST_THRESHOLDS,
} from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectFeeAssetById,
  selectHighestBalanceAccountIdByStakingId,
  selectMarketDataById,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ThorchainSaversDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

type DepositProps = StepComponentProps & {
  accountId?: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
  fromAddress: string | null
}

const percentOptions = [0.25, 0.5, 0.75, 1]

export const Deposit: React.FC<DepositProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
  fromAddress,
  onNext,
}) => {
  const [outboundFeeCryptoBaseUnit, setOutboundFeeCryptoBaseUnit] = useState('')
  const [isApprovalRequired, setIsApprovalRequired] = useState(false)
  const { state, dispatch: contextDispatch } = useContext(DepositContext)

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
  const [quoteLoading, setQuoteLoading] = useState(false)
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query
  const assets = useAppSelector(selectAssets)

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const isTokenDeposit = isToken(fromAssetId(assetId).assetReference)

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
    selectHighestBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
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

  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const userAddress: string | undefined = accountId && fromAccountId(accountId).account
  const balanceFilter = useMemo(() => ({ assetId, accountId }), [accountId, assetId])
  // user info
  const balanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, balanceFilter),
  )

  const getOutboundFeeCryptoBaseUnit = useCallback(async (): Promise<string> => {
    if (!assetId) return '0'

    // We only want to display the outbound fee as a minimum for assets which have a zero dust threshold i.e EVM and Cosmos assets
    if (!bn(THORCHAIN_SAVERS_DUST_THRESHOLDS[assetId]).isZero()) return '0'
    const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
    const maybeInboundAddressData = await getInboundAddressDataForChain(daemonUrl, assetId)

    return maybeInboundAddressData
      .match<Result<string, SwapErrorRight>>({
        ok: ({ outbound_fee }) => {
          const outboundFeeCryptoBaseUnit = toBaseUnit(
            fromThorBaseUnit(outbound_fee),
            asset.precision,
          )

          return Ok(outboundFeeCryptoBaseUnit)
        },
        err: _err => Ok('0'),
      })
      .unwrap()
  }, [asset.precision, assetId])

  useEffect(() => {
    ;(async () => {
      if (outboundFeeCryptoBaseUnit) return

      const outboundFee = await getOutboundFeeCryptoBaseUnit()
      if (!outboundFee) return

      setOutboundFeeCryptoBaseUnit(outboundFee)
    })()
  }, [getOutboundFeeCryptoBaseUnit, outboundFeeCryptoBaseUnit])
  // notify
  const toast = useToast()

  const supportedEvmChainIds = useMemo(() => getSupportedEvmChainIds(), [])

  const saversRouterContractAddress = useRouterContractAddress({
    feeAssetId: feeAsset?.assetId ?? '',
    skip: !isTokenDeposit || !feeAsset?.assetId,
  })

  useEffect(() => {
    if (!inputValues || !accountId)
      return // Router contract address is only set in case we're depositting a token, not a native asset
    ;(async () => {
      const isApprovalRequired = await (async () => {
        if (!saversRouterContractAddress) return false
        const allowanceOnChainCryptoBaseUnit = await getErc20Allowance({
          address: fromAssetId(assetId).assetReference,
          spender: saversRouterContractAddress,
          from: fromAccountId(accountId).account,
          chainId: asset.chainId,
        })
        const { cryptoAmount } = inputValues

        const cryptoAmountBaseUnit = toBaseUnit(cryptoAmount, asset.precision)

        if (bn(cryptoAmountBaseUnit).gt(allowanceOnChainCryptoBaseUnit)) return true
        return false
      })()
      setIsApprovalRequired(isApprovalRequired)
    })()
  }, [accountId, asset.chainId, asset.precision, assetId, inputValues, saversRouterContractAddress])

  const {
    data: thorchainSaversDepositQuote,
    isLoading: isThorchainSaversDepositQuoteLoading,
    isError: isThorchainSaversDepositQuoteError,
    error: thorchainSaversDepositQuoteError,
  } = useGetThorchainSaversDepositQuoteQuery({
    asset,
    amountCryptoBaseUnit: bnOrZero(inputValues?.cryptoAmount).times(bn(10).pow(asset.precision)),
  })

  // TODO(gomes): use useGetEstimatedFeesQuery instead of this.
  // The logic of useGetEstimatedFeesQuery and its consumption will need some touching up to work with custom Txs
  // since the guts of it are made to accomodate Tx/fees/sweep fees deduction and there are !isUtxoChainId checks in place currently
  // The method below is now only used for non-UTXO chains
  const getDepositGasEstimateCryptoPrecision = useCallback(
    async (deposit: DepositValues): Promise<string | undefined> => {
      if (
        !(
          userAddress &&
          assetReference &&
          accountId &&
          opportunityData &&
          accountNumber !== undefined &&
          wallet &&
          feeAsset &&
          !isThorchainSaversDepositQuoteLoading
        )
      )
        return
      try {
        const amountCryptoBaseUnit = toBaseUnit(deposit.cryptoAmount, asset.precision)

        if (isThorchainSaversDepositQuoteError)
          throw new Error(thorchainSaversDepositQuoteError.message)
        const quote = thorchainSaversDepositQuote!

        const chainAdapters = getChainAdapterManager()

        // We can only estimate the gas at this stage if allowance is already granted
        // Else, the Tx simulation will fail
        if (isTokenDeposit && !isApprovalRequired) {
          const thorContract = getOrCreateContractByType({
            address: saversRouterContractAddress!,
            type: ContractType.ThorRouter,
            chainId: asset.chainId,
          })

          const data = encodeFunctionData({
            abi: thorContract.abi,
            functionName: 'depositWithExpiry',
            args: [
              getAddress(quote.inbound_address),
              getAddress(fromAssetId(assetId).assetReference),
              BigInt(amountCryptoBaseUnit.toString()),
              quote.memo,
              BigInt(quote.expiry),
            ],
          })

          const adapter = assertGetEvmChainAdapter(chainId)

          const customTxInput = await createBuildCustomTxInput({
            accountNumber,
            adapter,
            data,
            value: '0', // this is not a token send, but a smart contract call so we don't send anything here, THOR router does
            to: saversRouterContractAddress!,
            wallet,
          })

          // TODO(gomes): moved to estimateFees just so that we can use useGetEstimatedFeesQuery() instead of adapter.getFeeData()
          // now all there's to do is actually use that instead
          const fees = (await estimateFees({
            accountId,
            contractAddress: undefined,
            assetId,
            sendMax: false,
            cryptoAmount: '0',
            to: customTxInput.to,
            from: fromAccountId(accountId).account,
            memo: customTxInput.data,
          })) as FeeDataEstimate<KnownChainIds.EthereumMainnet>

          const fastFeeCryptoBaseUnit = fees.fast.txFee

          const fastFeeCryptoPrecision = bnOrZero(
            bn(fastFeeCryptoBaseUnit).div(bn(10).pow(feeAsset.precision)),
          )

          return fastFeeCryptoPrecision.toString()
        }

        const adapter = chainAdapters.get(chainId)!
        const getFeeDataInput = {
          to: quote.inbound_address,
          value: amountCryptoBaseUnit,
          chainSpecific: {
            pubkey: userAddress,
            // EVM chains are the only ones explicitly requiring a `from` param for the gas estimation to work
            // Cosmos assets fees are hardcoded, and UTXOs will never hit this method
            from: supportedEvmChainIds.includes(chainId) ? userAddress : '',
          },
          sendMax: Boolean(state?.deposit.sendMax),
        }
        const fastFeeCryptoBaseUnit = (await adapter.getFeeData(getFeeDataInput)).fast.txFee

        const fastFeeCryptoPrecision = bnOrZero(
          bn(fastFeeCryptoBaseUnit).div(bn(10).pow(asset.precision)),
        )
        return bnOrZero(fastFeeCryptoPrecision).toString()
      } catch (error) {
        console.error(error)
        toast({
          position: 'top-right',
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
      }
    },
    [
      userAddress,
      assetReference,
      accountId,
      opportunityData,
      accountNumber,
      wallet,
      feeAsset,
      isThorchainSaversDepositQuoteLoading,
      asset,
      isThorchainSaversDepositQuoteError,
      thorchainSaversDepositQuoteError?.message,
      thorchainSaversDepositQuote,
      isTokenDeposit,
      isApprovalRequired,
      chainId,
      supportedEvmChainIds,
      state?.deposit.sendMax,
      saversRouterContractAddress,
      assetId,
      toast,
      translate,
    ],
  )

  const {
    data: estimatedFeesData,
    isLoading: isEstimatedFeesDataLoading,
    isSuccess: isEstimatedFeesDataSuccess,
  } = useGetEstimatedFeesQuery({
    cryptoAmount: inputValues?.cryptoAmount ?? '0',
    assetId,
    to: thorchainSaversDepositQuote?.inbound_address ?? '',
    sendMax: false,
    accountId: accountId ?? '',
    contractAddress: undefined,
    enabled: Boolean(thorchainSaversDepositQuote && accountId && isUtxoChainId(asset.chainId)),
  })

  // TODO(gomes): this will work for UTXO but is invalid for tokens since they use diff. denoms
  // TODO(gomes): actually check for enough balance here
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
        .plus(bnOrZero(txFeeCryptoBaseUnit).div(bn(10).pow(precision ?? '0')))
        .lte(balanceCryptoBaseUnitBn.div(bn(10).pow(precision)))
    },
    [],
  )

  const isSweepNeededArgs = useMemo(
    () => ({
      assetId,
      address: fromAddress,
      amountCryptoBaseUnit: bnOrZero(inputValues?.cryptoAmount ?? '0')
        .times(bn(10).pow(feeAsset?.precision ?? 0))
        .toString(),
      txFeeCryptoBaseUnit: estimatedFeesData?.txFeeCryptoBaseUnit ?? '0',
      // Don't fetch sweep needed if there isn't enough balance for the tx + fees, since adding in a sweep Tx would obviously fail too
      enabled: Boolean(
        bnOrZero(inputValues?.cryptoAmount).gt(0) &&
          isEstimatedFeesDataSuccess &&
          getHasEnoughBalanceForTxPlusFees({
            precision: asset.precision,
            balanceCryptoBaseUnit,
            amountCryptoPrecision: inputValues?.cryptoAmount ?? '',
            txFeeCryptoBaseUnit: estimatedFeesData?.txFeeCryptoBaseUnit ?? '',
          }),
      ),
    }),
    [
      asset.precision,
      assetId,
      balanceCryptoBaseUnit,
      estimatedFeesData?.txFeeCryptoBaseUnit,
      feeAsset?.precision,
      fromAddress,
      getHasEnoughBalanceForTxPlusFees,
      inputValues?.cryptoAmount,
      isEstimatedFeesDataSuccess,
    ],
  )

  const { data: isSweepNeeded, isLoading: isSweepNeededLoading } =
    useIsSweepNeededQuery(isSweepNeededArgs)

  const getHasEnoughBalanceForTxPlusFeesPlusSweep = useCallback(
    ({
      balanceCryptoBaseUnit,
      amountCryptoPrecision,
      txFeeCryptoBaseUnit,
      precision,
      sweepTxFeeCryptoBaseUnit,
    }: {
      balanceCryptoBaseUnit: string
      amountCryptoPrecision: string
      txFeeCryptoBaseUnit: string
      precision: number
      sweepTxFeeCryptoBaseUnit: string
    }) => {
      const balanceCryptoBaseUnitBn = bnOrZero(balanceCryptoBaseUnit)
      if (balanceCryptoBaseUnitBn.isZero()) return false

      return bnOrZero(amountCryptoPrecision)
        .plus(bnOrZero(txFeeCryptoBaseUnit).div(bn(10).pow(precision ?? '0')))
        .plus(bnOrZero(sweepTxFeeCryptoBaseUnit).div(bn(10).pow(precision ?? '0')))
        .lte(balanceCryptoBaseUnitBn.div(bn(10).pow(precision)))
    },
    [],
  )

  const handleContinue = useCallback(
    async (formValues: DepositValues) => {
      if (
        !(userAddress && opportunityData && inputValues && accountId && contextDispatch && feeAsset)
      )
        return
      // set deposit state for future use
      contextDispatch({ type: ThorchainSaversDepositActionType.SET_DEPOSIT, payload: formValues })
      contextDispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: true })
      try {
        const estimatedGasCryptoPrecision = isUtxoChainId(chainId)
          ? bnOrZero(estimatedFeesData?.txFeeCryptoBaseUnit)
              .div(bn(10).pow(feeAsset.precision))
              .toFixed()
          : await getDepositGasEstimateCryptoPrecision(formValues)

        if (!estimatedGasCryptoPrecision) return
        contextDispatch({
          type: ThorchainSaversDepositActionType.SET_DEPOSIT,
          payload: { estimatedGasCryptoPrecision },
        })

        const approvalFees = await (() => {
          if (
            !isApprovalRequired ||
            !saversRouterContractAddress ||
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
            args: [getAddress(saversRouterContractAddress), BigInt(MaxUint256.toString())],
          })

          const adapter = assertGetEvmChainAdapter(chainId)

          return getFees({
            accountNumber,
            adapter,
            data,
            to: fromAssetId(assetId).assetReference,
            value: '0',
            wallet,
          })
        })()
        if (approvalFees) {
          contextDispatch({
            type: ThorchainSaversDepositActionType.SET_APPROVE,
            payload: {
              estimatedGasCryptoPrecision: bnOrZero(approvalFees.networkFeeCryptoBaseUnit)
                .div(bn(10).pow(feeAsset.precision))
                .toString(),
            },
          })

          onNext(DefiStep.Approve)
          return
        }
        onNext(isSweepNeeded ? DefiStep.Sweep : DefiStep.Confirm)
        trackOpportunityEvent(
          MixPanelEvents.DepositContinue,
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
      userAddress,
      opportunityData,
      inputValues,
      accountId,
      contextDispatch,
      feeAsset,
      chainId,
      estimatedFeesData?.txFeeCryptoBaseUnit,
      getDepositGasEstimateCryptoPrecision,
      onNext,
      isSweepNeeded,
      assetId,
      assets,
      isApprovalRequired,
      saversRouterContractAddress,
      accountNumber,
      wallet,
      asset.chainId,
      toast,
      translate,
    ],
  )

  const handleCancel = useCallback(() => {
    browserHistory.goBack()
  }, [browserHistory])

  // TODO(gomes): abstract me into a pure method when implementing sweep for withdraw, and handle non-UTXO chains
  const fetchHasEnoughBalanceForTxPlusFeesPlusSweep = useCallback(
    async (valueCryptoPrecision: string) => {
      const isUtxoChain = isUtxoChainId(asset.chainId)
      const estimateFeesQueryEnabled = Boolean(fromAddress && accountId && isUtxoChain)

      const amountCryptoBaseUnit = bn(valueCryptoPrecision)
        .times(bn(10).pow(asset.precision))
        .toString()

      const thorchainSaversDepositQuoteQueryKey: GetThorchainSaversDepositQuoteQueryKey = [
        'thorchainSaversDepositQuote',
        { asset, amountCryptoBaseUnit },
      ]

      const _thorchainSaversDepositQuote = await queryClient.fetchQuery({
        queryKey: thorchainSaversDepositQuoteQueryKey,
        queryFn: getThorchainSaversDepositQuoteQueryFn,
      })

      const estimatedFeesQueryArgs = {
        estimateFeesInput: {
          cryptoAmount: valueCryptoPrecision,
          assetId,
          to: _thorchainSaversDepositQuote?.inbound_address ?? '',
          sendMax: false,
          accountId: accountId ?? '',
          contractAddress: undefined,
        },
        asset,
        assetMarketData: marketData,
        enabled: estimateFeesQueryEnabled,
      }

      const estimatedFeesQueryKey: EstimatedFeesQueryKey = ['estimateFees', estimatedFeesQueryArgs]

      const _estimatedFeesData = estimateFeesQueryEnabled
        ? await queryClient.fetchQuery({
            queryKey: estimatedFeesQueryKey,
            queryFn: getEstimatedFeesQueryFn,
          })
        : undefined

      const _hasEnoughBalanceForTxPlusFees = getHasEnoughBalanceForTxPlusFees({
        precision: asset.precision,
        balanceCryptoBaseUnit,
        amountCryptoPrecision: valueCryptoPrecision,
        txFeeCryptoBaseUnit: _estimatedFeesData?.txFeeCryptoBaseUnit ?? '',
      })

      const isSweepNeededQueryEnabled = Boolean(
        bnOrZero(valueCryptoPrecision).gt(0) &&
          _estimatedFeesData &&
          _hasEnoughBalanceForTxPlusFees,
      )

      const isSweepNeededQueryArgs = {
        assetId,
        address: fromAddress,
        txFeeCryptoBaseUnit: _estimatedFeesData?.txFeeCryptoBaseUnit ?? '0',
        amountCryptoBaseUnit,
      }

      const isSweepNeededQueryKey: IsSweepNeededQueryKey = ['isSweepNeeded', isSweepNeededQueryArgs]

      const _isSweepNeeded = isSweepNeededQueryEnabled
        ? await queryClient.fetchQuery({
            queryKey: isSweepNeededQueryKey,
            queryFn: isSweepNeededQueryFn,
          })
        : undefined

      const isEstimateSweepFeesQueryEnabled = Boolean(_isSweepNeeded && accountId && isUtxoChain)

      const estimatedSweepFeesQueryArgs = {
        asset,
        assetMarketData: marketData,
        estimateFeesInput: {
          cryptoAmount: '0',
          assetId,
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

      const hasEnoughBalanceForTxPlusFeesPlusSweep =
        bnOrZero(balanceCryptoBaseUnit).gt(0) &&
        getHasEnoughBalanceForTxPlusFeesPlusSweep({
          precision: asset.precision,
          balanceCryptoBaseUnit,
          amountCryptoPrecision: valueCryptoPrecision,
          txFeeCryptoBaseUnit: _estimatedFeesData?.txFeeCryptoBaseUnit ?? '0',
          sweepTxFeeCryptoBaseUnit: _estimatedSweepFeesData?.txFeeCryptoBaseUnit ?? '0',
        })

      return hasEnoughBalanceForTxPlusFeesPlusSweep
    },
    [
      accountId,
      asset,
      assetId,
      balanceCryptoBaseUnit,
      fromAddress,
      getHasEnoughBalanceForTxPlusFees,
      getHasEnoughBalanceForTxPlusFeesPlusSweep,
      marketData,
      queryClient,
    ],
  )

  const validateCryptoAmount = useCallback(
    async (value: string) => {
      const valueCryptoBaseUnit = toBaseUnit(value, asset.precision)
      const balanceCryptoPrecision = bnOrZero(balanceCryptoBaseUnit).div(
        bn(10).pow(asset.precision),
      )

      if (balanceCryptoPrecision.isZero() || balanceCryptoPrecision.lt(value))
        return 'common.insufficientFunds'

      const valueCryptoPrecision = bnOrZero(value)
      if (valueCryptoPrecision.isEqualTo(0)) return ''

      const isBelowMinSellAmount = !isAboveDepositDustThreshold({ valueCryptoBaseUnit, assetId })
      const isBelowOutboundFee =
        bn(outboundFeeCryptoBaseUnit).gt(0) &&
        bnOrZero(valueCryptoBaseUnit).lt(outboundFeeCryptoBaseUnit)

      const minLimitCryptoPrecision = bn(THORCHAIN_SAVERS_DUST_THRESHOLDS[assetId]).div(
        bn(10).pow(asset.precision),
      )
      const outboundFeeCryptoPrecision = bn(outboundFeeCryptoBaseUnit).div(
        bn(10).pow(asset.precision),
      )
      const minLimit = `${minLimitCryptoPrecision} ${asset.symbol}`
      const outboundFeeLimit = `${outboundFeeCryptoPrecision} ${asset.symbol}`

      if (isBelowMinSellAmount) return translate('trade.errors.amountTooSmall', { minLimit })
      if (isBelowOutboundFee)
        return translate('trade.errors.amountTooSmall', { minLimit: outboundFeeLimit })

      const hasEnoughBalanceForTxPlusFeesPlusSweep =
        await fetchHasEnoughBalanceForTxPlusFeesPlusSweep(value)

      return hasEnoughBalanceForTxPlusFeesPlusSweep || 'common.insufficientFunds'
    },
    [
      asset.precision,
      asset.symbol,
      balanceCryptoBaseUnit,
      assetId,
      outboundFeeCryptoBaseUnit,
      translate,
      fetchHasEnoughBalanceForTxPlusFeesPlusSweep,
    ],
  )

  const validateFiatAmount = useCallback(
    async (value: string) => {
      const valueCryptoPrecision = bnOrZero(value).div(marketData.price)
      const balanceCryptoPrecision = bnOrZero(balanceCryptoBaseUnit).div(
        bn(10).pow(asset.precision),
      )

      const fiatBalance = balanceCryptoPrecision.times(marketData.price)
      if (fiatBalance.isZero() || fiatBalance.lt(value)) return 'common.insufficientFunds'

      const valueCryptoBaseUnit = valueCryptoPrecision.times(bn(10).pow(asset.precision))

      const isBelowMinSellAmount = !isAboveDepositDustThreshold({ valueCryptoBaseUnit, assetId })
      const isBelowOutboundFee =
        bn(outboundFeeCryptoBaseUnit).gt(0) &&
        bnOrZero(valueCryptoBaseUnit).lt(outboundFeeCryptoBaseUnit)

      const minLimitCryptoPrecision = bn(THORCHAIN_SAVERS_DUST_THRESHOLDS[assetId]).div(
        bn(10).pow(asset.precision),
      )
      const outboundFeeCryptoPrecision = bn(outboundFeeCryptoBaseUnit).div(
        bn(10).pow(asset.precision),
      )
      const minLimit = `${minLimitCryptoPrecision} ${asset.symbol}`
      const outboundFeeLimit = `${outboundFeeCryptoPrecision} ${asset.symbol}`

      if (isBelowMinSellAmount) return translate('trade.errors.amountTooSmall', { minLimit })
      if (isBelowOutboundFee)
        return translate('trade.errors.amountTooSmall', { minLimit: outboundFeeLimit })

      const hasEnoughBalanceForTxPlusFeesPlusSweep =
        await fetchHasEnoughBalanceForTxPlusFeesPlusSweep(valueCryptoPrecision.toFixed())
      return hasEnoughBalanceForTxPlusFeesPlusSweep || 'common.insufficientFunds'
    },
    [
      marketData.price,
      balanceCryptoBaseUnit,
      asset.precision,
      asset.symbol,
      assetId,
      outboundFeeCryptoBaseUnit,
      translate,
      fetchHasEnoughBalanceForTxPlusFeesPlusSweep,
    ],
  )

  const cryptoAmountAvailable = useMemo(
    () => bnOrZero(balanceCryptoBaseUnit).div(bn(10).pow(asset.precision)),
    [balanceCryptoBaseUnit, asset?.precision],
  )
  const fiatAmountAvailable = useMemo(
    () => bnOrZero(cryptoAmountAvailable).times(marketData.price),
    [cryptoAmountAvailable, marketData?.price],
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
    async (percent: number) => {
      if (!contextDispatch) return
      contextDispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: true })
      setIsSendMax(percent === 1)

      const _percentageCryptoAmountPrecisionBeforeTxFees =
        bnOrZero(cryptoAmountAvailable).times(percent)

      const estimateFeesQueryEnabled = Boolean(
        fromAddress && accountId && isUtxoChainId(asset.chainId),
      )
      // Fees before fees isn't a typo, it's an actual flow:
      // 1. We get the initial fees to proceed to fee deduction to get the amount after fees
      // However, the amount we get is not reliable just yet, since send max, by definition, do not create a change output
      // and are effectively cheaper than partial sends here
      const estimatedFeesBeforeFeesQueryArgs = {
        estimateFeesInput: {
          cryptoAmount: _percentageCryptoAmountPrecisionBeforeTxFees.toFixed(),
          assetId,
          to: fromAddress ?? '',
          sendMax: false,
          accountId: accountId ?? '',
          contractAddress: undefined,
        },
        asset,
        assetMarketData: marketData,
        enabled: Boolean(accountId && isUtxoChainId(asset.chainId)),
      }
      const estimatedFeesBeforeFeesQueryKey: EstimatedFeesQueryKey = [
        'estimateFees',
        estimatedFeesBeforeFeesQueryArgs,
      ]

      const _estimatedFeesBeforeFeesData = estimateFeesQueryEnabled
        ? await queryClient.fetchQuery({
            queryKey: estimatedFeesBeforeFeesQueryKey,
            queryFn: getEstimatedFeesQueryFn,
          })
        : undefined

      const isSweepNeededQueryEnabled = Boolean(
        _percentageCryptoAmountPrecisionBeforeTxFees.gt(0) && _estimatedFeesBeforeFeesData,
      )

      const isSweepNeededQueryArgs = {
        assetId,
        address: fromAddress,
        // Assune 0 fees, so that sweep needed properly return true/false
        txFeeCryptoBaseUnit: '0',
        amountCryptoBaseUnit: _percentageCryptoAmountPrecisionBeforeTxFees
          .times(bn(10).pow(asset.precision))
          .toString(),
      }

      const isSweepNeededQueryKey: IsSweepNeededQueryKey = ['isSweepNeeded', isSweepNeededQueryArgs]
      const _isSweepNeeded = isSweepNeededQueryEnabled
        ? await queryClient.fetchQuery({
            queryKey: isSweepNeededQueryKey,
            queryFn: isSweepNeededQueryFn,
          })
        : undefined

      const isEstimateSweepFeesQueryEnabled = Boolean(
        _isSweepNeeded && accountId && isUtxoChainId(asset.chainId),
      )
      const estimatedSweepFeesQueryArgs = {
        asset,
        assetMarketData: marketData,
        estimateFeesInput: {
          cryptoAmount: '0',
          assetId,
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
          .minus(
            bnOrZero(_estimatedFeesBeforeFeesData?.txFeeCryptoBaseUnit).div(
              bn(10).pow(asset.precision),
            ),
          )
          .minus(
            bnOrZero(_estimatedSweepFeesData?.txFeeCryptoBaseUnit).div(bn(10).pow(asset.precision)),
          )

      const estimatedFeesAfterFeesQueryArgs = {
        estimateFeesInput: {
          cryptoAmount: _percentageCryptoAmountPrecisionAfterTxFeesAndSweep.toFixed(),
          assetId,
          to: fromAddress ?? '',
          sendMax: false,
          accountId: accountId ?? '',
          contractAddress: undefined,
        },
        asset,
        assetMarketData: marketData,
        enabled: Boolean(accountId && isUtxoChainId(asset.chainId)),
      }
      const estimatedFeesAfterFeesQueryKey: EstimatedFeesQueryKey = [
        'estimateFees',
        estimatedFeesAfterFeesQueryArgs,
      ]

      const _estimatedFeesAfterFeesData = estimateFeesQueryEnabled
        ? await queryClient.fetchQuery({
            queryKey: estimatedFeesAfterFeesQueryKey,
            queryFn: getEstimatedFeesQueryFn,
          })
        : undefined

      const _finalPercentageCryptoAmountPrecisionAfterTxFeesAndSweep =
        _percentageCryptoAmountPrecisionBeforeTxFees
          .minus(
            bnOrZero(_estimatedFeesAfterFeesData?.txFeeCryptoBaseUnit).div(
              bn(10).pow(asset.precision),
            ),
          )
          .minus(
            bnOrZero(_estimatedSweepFeesData?.txFeeCryptoBaseUnit).div(bn(10).pow(asset.precision)),
          )
      const _percentageFiatAmount = _finalPercentageCryptoAmountPrecisionAfterTxFeesAndSweep.times(
        marketData.price,
      )
      contextDispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: false })
      return {
        amountCryptoPrecision: _finalPercentageCryptoAmountPrecisionAfterTxFeesAndSweep.toFixed(),
        fiatAmount: _percentageFiatAmount.toFixed(),
      }
    },
    [
      accountId,
      asset,
      assetId,
      contextDispatch,
      cryptoAmountAvailable,
      fromAddress,
      marketData,
      queryClient,
      setIsSendMax,
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
      setQuoteLoading(true)

      if (isThorchainSaversDepositQuoteError)
        throw new Error(thorchainSaversDepositQuoteError.message)

      const quote = thorchainSaversDepositQuote!

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
        apy: opportunityData?.apy,
      })
      setDaysToBreakEven(daysToBreakEven)
      setQuoteLoading(false)
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

  const handleInputChange = useCallback((fiatAmount: string, cryptoAmount: string) => {
    setInputValues({ fiatAmount, cryptoAmount })
  }, [])

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
      validate: { validateCryptoAmount },
    }),
    [validateCryptoAmount],
  )

  const fiatInputValidation = useMemo(
    () => ({
      required: true,
      validate: { validateFiatAmount },
    }),
    [validateFiatAmount],
  )

  if (!state || !contextDispatch || !opportunityData) return null

  return (
    <ReusableDeposit
      accountId={accountId}
      onAccountIdChange={handleAccountIdChange}
      asset={asset}
      apy={bnOrZero(opportunityData?.apy).toString()}
      cryptoAmountAvailable={cryptoAmountAvailable.toPrecision()}
      cryptoInputValidation={cryptoInputValidation}
      fiatAmountAvailable={fiatAmountAvailable.toFixed(2)}
      fiatInputValidation={fiatInputValidation}
      marketData={marketData}
      onCancel={handleCancel}
      onPercentClick={handlePercentClick}
      onContinue={handleContinue}
      onBack={handleBack}
      onChange={handleInputChange}
      percentOptions={percentOptions}
      enableSlippage={false}
      isLoading={isEstimatedFeesDataLoading || isSweepNeededLoading || state.loading}
    >
      <Row>
        <Row.Label>{translate('common.slippage')}</Row.Label>
        <Row.Value>
          <Skeleton isLoaded={!quoteLoading}>
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
          <Skeleton isLoaded={!quoteLoading}>
            {translate(
              `defi.modals.saversVaults.${bnOrZero(daysToBreakEven).eq(1) ? 'day' : 'days'}`,
              { amount: daysToBreakEven ?? '0' },
            )}
          </Skeleton>
        </Row.Value>
      </Row>
    </ReusableDeposit>
  )
}
