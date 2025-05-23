import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { useCallback, useContext, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { FoxyDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

import type { StepComponentProps } from '@/components/DeFi/components/Steps'
import { Approve as ReusableApprove } from '@/features/defi/components/Approve/Approve'
import { ApprovePreFooter } from '@/features/defi/components/Approve/ApprovePreFooter'
import type { DepositValues } from '@/features/defi/components/Deposit/Deposit'
import { DefiAction, DefiStep } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { canCoverTxFees } from '@/features/defi/helpers/utils'
import { useFoxyQuery } from '@/features/defi/providers/foxy/components/FoxyManager/useFoxyQuery'
import { usePoll } from '@/hooks/usePoll/usePoll'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { isSome } from '@/lib/utils'
import { getFoxyApi } from '@/state/apis/foxy/foxyApiSingleton'
import { DefiProvider } from '@/state/slices/opportunitiesSlice/types'
import { selectBip44ParamsByAccountId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ApproveProps = StepComponentProps & { accountId: AccountId | undefined }

export const Approve: React.FC<ApproveProps> = ({ accountId, onNext }) => {
  const { poll } = usePoll()
  const foxyApi = getFoxyApi()
  const { state, dispatch } = useContext(DepositContext)
  const estimatedGasCryptoBaseUnit = state?.approve.estimatedGasCryptoBaseUnit
  const navigate = useNavigate()
  const translate = useTranslate()
  const toast = useToast()
  const {
    stakingAssetReference: assetReference,
    feeMarketData,
    contractAddress,
    stakingAsset: asset,
    feeAsset,
  } = useFoxyQuery()

  const estimatedGasCryptoPrecision = useMemo(
    () =>
      bnOrZero(estimatedGasCryptoBaseUnit)
        .div(bn(10).pow(feeAsset?.precision ?? 0))
        .toFixed(),
    [estimatedGasCryptoBaseUnit, feeAsset?.precision],
  )

  // user info
  const { state: walletState } = useWallet()

  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : null),
    [accountId],
  )
  const bip44Params = useAppSelector(state => selectBip44ParamsByAccountId(state, accountFilter))

  const getDepositGasEstimateCryptoBaseUnit = useCallback(
    async (deposit: DepositValues) => {
      if (!accountAddress || !assetReference || !foxyApi) return
      try {
        const feeDataEstimate = await foxyApi.estimateDepositFees({
          tokenContractAddress: assetReference,
          contractAddress,
          amountDesired: bnOrZero(deposit.cryptoAmount)
            .times(bn(10).pow(asset.precision))
            .decimalPlaces(0),
          userAddress: accountAddress,
        })

        const {
          chainSpecific: { gasPrice, gasLimit },
        } = feeDataEstimate.fast
        return bnOrZero(gasPrice).times(gasLimit).toFixed(0)
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
    [foxyApi, asset.precision, assetReference, contractAddress, accountAddress, toast, translate],
  )

  const handleApprove = useCallback(async () => {
    if (
      !(
        assetReference &&
        accountAddress &&
        walletState.wallet &&
        foxyApi &&
        dispatch &&
        bip44Params &&
        state &&
        feeAsset
      )
    )
      return
    try {
      dispatch({ type: FoxyDepositActionType.SET_LOADING, payload: true })

      if (!supportsETH(walletState.wallet))
        throw new Error(`handleApprove: wallet does not support ethereum`)

      await foxyApi.approve({
        tokenContractAddress: assetReference,
        contractAddress,
        userAddress: accountAddress,
        wallet: walletState.wallet,
        amount: bn(
          bnOrZero(state?.deposit.cryptoAmount)
            .times(bn(10).pow(asset.precision))
            .integerValue(),
        ).toFixed(),
        bip44Params,
      })
      await poll({
        fn: () =>
          foxyApi.allowance({
            tokenContractAddress: assetReference,
            contractAddress,
            userAddress: accountAddress,
          }),
        validate: (result: string) => {
          const allowance = bnOrZero(result).div(bn(10).pow(asset.precision))
          return bnOrZero(allowance).gte(state?.deposit.cryptoAmount)
        },
        interval: 15000,
        maxAttempts: 60,
      })
      // Get deposit gas estimate
      const estimatedGasCryptoBaseUnit = await getDepositGasEstimateCryptoBaseUnit(state?.deposit)
      if (!estimatedGasCryptoBaseUnit) return
      dispatch({
        type: FoxyDepositActionType.SET_DEPOSIT,
        payload: { estimatedGasCryptoBaseUnit },
      })

      onNext(DefiStep.Confirm)
    } catch (error) {
      console.error(error)
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error',
      })
    } finally {
      dispatch({ type: FoxyDepositActionType.SET_LOADING, payload: false })
    }
  }, [
    assetReference,
    accountAddress,
    walletState.wallet,
    foxyApi,
    dispatch,
    bip44Params,
    state,
    feeAsset,
    contractAddress,
    asset.precision,
    poll,
    getDepositGasEstimateCryptoBaseUnit,
    onNext,
    toast,
    translate,
  ])

  const hasEnoughBalanceForGas = useMemo(
    () =>
      isSome(accountId) &&
      isSome(estimatedGasCryptoBaseUnit) &&
      canCoverTxFees({
        feeAsset,
        estimatedGasCryptoPrecision,
        accountId,
      }),
    [accountId, estimatedGasCryptoBaseUnit, feeAsset, estimatedGasCryptoPrecision],
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

  const handleCancel = useCallback(() => {
    navigate('/')
  }, [navigate])
  const handleToggle = useCallback(
    () =>
      dispatch?.({
        type: FoxyDepositActionType.SET_IS_EXACT_ALLOWANCE,
        payload: !state?.isExactAllowance,
      }),
    [dispatch, state?.isExactAllowance],
  )

  if (!state || !dispatch) return null

  return (
    <ReusableApprove
      asset={asset}
      spenderName={DefiProvider.ShapeShift}
      feeAsset={feeAsset}
      estimatedGasFeeCryptoPrecision={bnOrZero(estimatedGasCryptoBaseUnit)
        .div(bn(10).pow(feeAsset.precision))
        .toFixed(5)}
      disabled={!hasEnoughBalanceForGas}
      fiatEstimatedGasFee={bnOrZero(estimatedGasCryptoBaseUnit)
        .div(bn(10).pow(feeAsset.precision))
        .times(bnOrZero(feeMarketData?.price))
        .toFixed(2)}
      loading={state.loading}
      preFooter={preFooter}
      isExactAllowance={state.isExactAllowance}
      onCancel={handleCancel}
      onConfirm={handleApprove}
      spenderContractAddress={contractAddress}
      onToggle={handleToggle}
    />
  )
}
