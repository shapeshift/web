import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import { ContractType, getOrCreateContractByType } from '@shapeshiftoss/contracts'
import { assetIdToPoolAssetId } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import type { Asset } from '@shapeshiftoss/types'
import { Approve as ReusableApprove } from 'features/defi/components/Approve/Approve'
import { ApprovePreFooter } from 'features/defi/components/Approve/ApprovePreFooter'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { canCoverTxFees } from 'features/defi/helpers/utils'
import { useCallback, useContext, useMemo } from 'react'
import { useHistory } from 'react-router-dom'
import { encodeFunctionData, getAddress, maxUint256 } from 'viem'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { usePoll } from 'hooks/usePoll/usePoll'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { isSome, isToken } from 'lib/utils'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
  getErc20Allowance,
} from 'lib/utils/evm'
import { useGetThorchainSaversDepositQuoteQuery } from 'lib/utils/thorchain/hooks/useGetThorchainSaversDepositQuoteQuery'
import { useSendThorTx } from 'lib/utils/thorchain/hooks/useSendThorTx'
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

type ApproveProps = StepComponentProps & { accountId: AccountId | undefined; isReset?: boolean }

export const Approve: React.FC<ApproveProps> = ({ accountId, onNext, isReset }) => {
  const { poll } = usePoll()
  const { state, dispatch } = useContext(DepositContext)
  const estimatedGasCryptoPrecision = state?.approve.estimatedGasCryptoPrecision
  const history = useHistory()
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

  const isTokenDeposit = isToken(assetId)

  const feeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )

  const { data: thorchainSaversDepositQuote } = useGetThorchainSaversDepositQuoteQuery({
    asset,
    amountCryptoBaseUnit: toBaseUnit(state?.deposit.cryptoAmount, asset.precision),
  })

  const { inboundAddress } = useSendThorTx({
    assetId,
    accountId: accountId ?? null,
    amountCryptoBaseUnit: toBaseUnit(state?.deposit.cryptoAmount, asset.precision),
    memo: thorchainSaversDepositQuote?.memo ?? null,
    fromAddress: '',
    action: 'depositSavers',
    enableEstimateFees: false,
  })

  const handleApprove = useCallback(async () => {
    if (
      !state?.deposit.cryptoAmount ||
      accountNumber === undefined ||
      !wallet ||
      !accountId ||
      !dispatch ||
      !opportunityData ||
      !inboundAddress
    )
      return

    dispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: true })

    try {
      const amountCryptoBaseUnitOrZero = isReset
        ? '0'
        : toBaseUnit(state.deposit.cryptoAmount, asset.precision)

      const poolId = assetIdToPoolAssetId({ assetId: asset.assetId })

      if (!poolId) throw new Error(`poolId not found for assetId ${asset.assetId}`)

      const contract = getOrCreateContractByType({
        address: fromAssetId(assetId).assetReference,
        type: ContractType.ERC20,
        chainId,
      })

      const amountToApprove =
        state.isExactAllowance || isReset ? amountCryptoBaseUnitOrZero : maxUint256

      const data = encodeFunctionData({
        abi: contract.abi,
        functionName: 'approve',
        args: [getAddress(inboundAddress), BigInt(amountToApprove)],
      })

      const adapter = assertGetEvmChainAdapter(chainId)

      const buildCustomTxInput = await createBuildCustomTxInput({
        accountNumber,
        from: fromAccountId(accountId).account,
        adapter,
        data,
        value: '0',
        to: fromAssetId(assetId).assetReference,
        wallet,
      })

      await buildAndBroadcast({
        adapter,
        buildCustomTxInput,
        receiverAddress: CONTRACT_INTERACTION, // no receiver for this contract call
      })
      await poll({
        fn: () =>
          getErc20Allowance({
            address: fromAssetId(assetId).assetReference,
            spender: inboundAddress,
            from: fromAccountId(accountId).account,
            chainId: asset.chainId,
          }),
        validate: (allowanceCryptoBaseUnit: string) => {
          if (isReset) return bnOrZero(allowanceCryptoBaseUnit).isZero()
          return bnOrZero(allowanceCryptoBaseUnit).gte(amountCryptoBaseUnitOrZero)
        },
        interval: 15000,
        maxAttempts: 60,
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

      onNext(isReset ? DefiStep.Approve : DefiStep.Confirm)
      dispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: false })
    } catch (error) {
      showErrorToast(error)
      dispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: false })
    }
  }, [
    accountId,
    accountNumber,
    asset.assetId,
    asset.chainId,
    asset.precision,
    assetId,
    assets,
    chainId,
    dispatch,
    inboundAddress,
    isReset,
    onNext,
    opportunityData,
    poll,
    showErrorToast,
    state?.deposit.cryptoAmount,
    state?.deposit.fiatAmount,
    state?.isExactAllowance,
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

  if (!isTokenDeposit || !inboundAddress || !state || !dispatch) return null

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
      isReset={isReset}
      loading={state.loading}
      preFooter={preFooter}
      isExactAllowance={state.isExactAllowance}
      onCancel={handleCancel}
      onConfirm={handleApprove}
      spenderContractAddress={inboundAddress}
      onToggle={onExactAllowanceToggle}
    />
  )
}
