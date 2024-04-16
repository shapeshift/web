import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { getOrCreateContractByType } from 'contracts/contractManager'
import { ContractType } from 'contracts/types'
import { Approve as ReusableApprove } from 'features/defi/components/Approve/Approve'
import { ApprovePreFooter } from 'features/defi/components/Approve/ApprovePreFooter'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { canCoverTxFees } from 'features/defi/helpers/utils'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { encodeFunctionData, getAddress } from 'viem'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { useRouterContractAddress } from 'lib/swapper/swappers/ThorchainSwapper/utils/useRouterContractAddress'
import { MAX_ALLOWANCE } from 'lib/swapper/swappers/utils/constants'
import { isSome, isToken } from 'lib/utils'
import { assertGetEvmChainAdapter, createBuildCustomTxInput } from 'lib/utils/evm'
import { useThorAllowance } from 'lib/utils/thorchain/hooks/useThorAllowance'
import { getMaybeThorchainSaversDepositQuote } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { DefiProvider } from 'state/slices/opportunitiesSlice/types'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectFeeAssetById,
  selectMarketDataByAssetIdUserCurrency,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ThorchainSaversDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

type ApproveProps = StepComponentProps & { accountId: AccountId | undefined }

export const Approve: React.FC<ApproveProps> = ({ accountId, onNext }) => {
  const { state, dispatch } = useContext(DepositContext)
  const estimatedGasCryptoPrecision = state?.approve.estimatedGasCryptoPrecision
  const history = useHistory()
  const translate = useTranslate()
  const { showErrorToast } = useErrorHandler()
  const {
    state: { wallet },
  } = useWallet()

  const accountNumberFilter = useMemo(() => ({ accountId }), [accountId])
  const accountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, accountNumberFilter),
  )
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const assets = useAppSelector(selectAssets)
  const asset: Asset | undefined = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId))

  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${assetId}`)

  const opportunityId = useMemo(
    () => toOpportunityId({ chainId, assetNamespace, assetReference }),
    [assetNamespace, assetReference, chainId],
  )

  const opportunityDataFilter = useMemo(
    () => ({
      userStakingId: serializeUserStakingId(accountId ?? '', opportunityId),
    }),
    [accountId, opportunityId],
  )

  const opportunityData = useAppSelector(state =>
    selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter),
  )

  const isTokenDeposit = isToken(assetReference)

  const feeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )

  const { routerContractAddress: saversRouterContractAddress } = useRouterContractAddress({
    assetId: assetId ?? '',
    skip: !isTokenDeposit || !feeAsset?.assetId,
    excludeHalted: true,
  })

  const { approveAsync, isApprovalTxSuccess } = useThorAllowance({
    assetId: assetId ?? '',
    accountId,
    amountCryptoPrecision: state?.isExactAllowance
      ? state?.deposit.cryptoAmount
      : fromBaseUnit(MAX_ALLOWANCE, feeAsset.precision),
  })

  const handleApprove = useCallback(async () => {
    if (!dispatch) return

    dispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: true })

    await approveAsync()
  }, [approveAsync, dispatch])

  // React on successful approval, estimates deposit gas and route to deposit step
  useEffect(() => {
    if (!isApprovalTxSuccess) return

    if (
      !state?.deposit.cryptoAmount ||
      accountNumber === undefined ||
      !wallet ||
      !accountId ||
      !dispatch ||
      !saversRouterContractAddress ||
      !opportunityData
    )
      return
    ;(async () => {
      try {
        const amountCryptoBaseUnit = toBaseUnit(state.deposit.cryptoAmount, asset.precision)
        const estimatedDepositGasCryptoPrecision = await (async () => {
          const maybeQuote = await getMaybeThorchainSaversDepositQuote({
            asset,
            amountCryptoBaseUnit,
          })
          if (maybeQuote.isErr()) throw new Error(maybeQuote.unwrapErr())
          const quote = maybeQuote.unwrap()
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
              BigInt(amountCryptoBaseUnit),
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

          const fees = await adapter.getFeeData({
            to: customTxInput.to,
            value: customTxInput.value,
            chainSpecific: {
              from: fromAccountId(accountId).account,
              data: customTxInput.data,
            },
          })

          const fastFeeCryptoBaseUnit = fees.fast.txFee
          const fastFeeCryptoPrecision = bnOrZero(
            bn(fastFeeCryptoBaseUnit).div(bn(10).pow(feeAsset.precision)),
          )

          return fastFeeCryptoPrecision.toString()
        })()

        dispatch({
          type: ThorchainSaversDepositActionType.SET_DEPOSIT,
          payload: { estimatedGasCryptoPrecision: estimatedDepositGasCryptoPrecision },
        })

        trackOpportunityEvent(
          MixPanelEvent.DepositApprove,
          {
            opportunity: opportunityData,
            fiatAmounts: [state.deposit.fiatAmount],
            cryptoAmounts: [{ assetId, amountCryptoHuman: state.deposit.cryptoAmount }],
          },
          assets,
        )

        onNext(DefiStep.Confirm)
        dispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: false })
      } catch (error) {
        showErrorToast(error)
        dispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: false })
      }
    })()
  }, [
    accountId,
    accountNumber,
    asset,
    assetId,
    assets,
    chainId,
    dispatch,
    feeAsset.precision,
    isApprovalTxSuccess,
    onNext,
    opportunityData,
    saversRouterContractAddress,
    showErrorToast,
    state?.deposit.cryptoAmount,
    state?.deposit.fiatAmount,
    wallet,
  ])

  const onExactAllowanceToggle = useCallback(() => {
    if (!dispatch) return

    dispatch({
      type: ThorchainSaversDepositActionType.SET_IS_EXACT_ALLOWANCE,
      payload: !state?.isExactAllowance,
    })
  }, [dispatch, state?.isExactAllowance])

  const hasEnoughBalanceForGas = useMemo(
    () =>
      isSome(accountId) &&
      isSome(estimatedGasCryptoPrecision) &&
      canCoverTxFees({
        feeAsset,
        estimatedGasCryptoPrecision,
        accountId,
      }),
    [accountId, feeAsset, estimatedGasCryptoPrecision],
  )

  const preFooter = useMemo(
    () => (
      <ApprovePreFooter
        accountId={accountId}
        action={DefiAction.Deposit}
        feeAsset={feeAsset}
        estimatedGasCryptoPrecision={estimatedGasCryptoPrecision}
      />
    ),
    [accountId, feeAsset, estimatedGasCryptoPrecision],
  )

  const handleCancel = useCallback(() => history.push('/'), [history])

  if (!saversRouterContractAddress || !state || !dispatch) return null

  return (
    <ReusableApprove
      asset={asset}
      spenderName={DefiProvider.ThorchainSavers}
      feeAsset={feeAsset}
      estimatedGasFeeCryptoPrecision={bnOrZero(estimatedGasCryptoPrecision).toFixed(5)}
      disabled={!hasEnoughBalanceForGas}
      fiatEstimatedGasFee={bnOrZero(estimatedGasCryptoPrecision)
        .times(feeMarketData.price)
        .toFixed(2)}
      loading={state.loading}
      loadingText={translate('common.approve')}
      learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
      preFooter={preFooter}
      isExactAllowance={state.isExactAllowance}
      onCancel={handleCancel}
      onConfirm={handleApprove}
      spenderContractAddress={saversRouterContractAddress}
      onToggle={onExactAllowanceToggle}
    />
  )
}
