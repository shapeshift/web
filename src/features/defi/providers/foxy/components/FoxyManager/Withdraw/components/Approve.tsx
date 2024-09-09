import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { Approve as ReusableApprove } from 'features/defi/components/Approve/Approve'
import { ApprovePreFooter } from 'features/defi/components/Approve/ApprovePreFooter'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { canCoverTxFees } from 'features/defi/helpers/utils'
import { useFoxyQuery } from 'features/defi/providers/foxy/components/FoxyManager/useFoxyQuery'
import { useCallback, useContext, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { usePoll } from 'hooks/usePoll/usePoll'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { isSome } from 'lib/utils'
import { getFoxyApi } from 'state/apis/foxy/foxyApiSingleton'
import { DefiProvider } from 'state/slices/opportunitiesSlice/types'
import { selectBIP44ParamsByAccountId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxyWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

type ApproveProps = StepComponentProps & { accountId: AccountId | undefined }

export const Approve: React.FC<ApproveProps> = ({ accountId, onNext }) => {
  const { poll } = usePoll()
  const foxyApi = getFoxyApi()
  const { state, dispatch } = useContext(WithdrawContext)
  const estimatedGasCryptoBaseUnit = state?.approve.estimatedGasCryptoBaseUnit
  const translate = useTranslate()
  const {
    underlyingAsset: asset,
    rewardId,
    feeAsset,
    feeMarketData,
    contractAddress,
  } = useFoxyQuery()
  const toast = useToast()

  const userAddress: string | undefined = accountId && fromAccountId(accountId).account

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
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))

  const getWithdrawGasEstimate = useCallback(
    async (withdraw: WithdrawValues) => {
      if (!(rewardId && userAddress && state?.withdraw && foxyApi && dispatch && bip44Params))
        return
      try {
        const feeDataEstimate = await foxyApi.estimateWithdrawFees({
          tokenContractAddress: rewardId,
          contractAddress,
          amountDesired: bnOrZero(
            bn(withdraw.cryptoAmount).times(`1e+${asset.precision}`),
          ).decimalPlaces(0),
          userAddress,
          type: state.withdraw.withdrawType,
          bip44Params,
        })

        const {
          chainSpecific: { gasPrice, gasLimit },
        } = feeDataEstimate.fast

        const returVal = bnOrZero(bn(gasPrice).times(gasLimit)).toFixed(0)
        return returVal
      } catch (error) {
        console.error(error)
        const fundsError =
          error instanceof Error && error.message.includes('Not enough funds in reserve')
        toast({
          position: 'top-right',
          description: fundsError
            ? translate('defi.notEnoughFundsInReserve')
            : translate('common.somethingWentWrong'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
      }
    },
    [
      rewardId,
      userAddress,
      state?.withdraw,
      foxyApi,
      dispatch,
      bip44Params,
      contractAddress,
      asset.precision,
      toast,
      translate,
    ],
  )

  const handleApprove = useCallback(async () => {
    if (
      !(
        rewardId &&
        walletState.wallet &&
        userAddress &&
        state?.withdraw &&
        foxyApi &&
        dispatch &&
        bip44Params &&
        feeAsset
      )
    )
      return

    try {
      if (!supportsETH(walletState.wallet))
        throw new Error(`handleApprove: wallet does not support ethereum`)
      dispatch({ type: FoxyWithdrawActionType.SET_LOADING, payload: true })

      await foxyApi.approve({
        tokenContractAddress: rewardId,
        contractAddress,
        userAddress,
        wallet: walletState.wallet,
        bip44Params,
      })
      await poll({
        fn: () =>
          foxyApi.allowance({
            tokenContractAddress: rewardId,
            contractAddress,
            userAddress,
          }),
        validate: (result: string) => {
          const allowance = bnOrZero(bn(result).div(bn(10).pow(asset.precision)))
          return bnOrZero(allowance).gte(state.withdraw.cryptoAmount)
        },
        interval: 15000,
        maxAttempts: 60,
      })
      // Get withdraw gas estimate
      const estimatedGasCrypto = await getWithdrawGasEstimate(state.withdraw)
      if (!estimatedGasCrypto) return
      dispatch({
        type: FoxyWithdrawActionType.SET_WITHDRAW,
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
      dispatch({ type: FoxyWithdrawActionType.SET_LOADING, payload: false })
    }
  }, [
    asset.precision,
    bip44Params,
    contractAddress,
    dispatch,
    estimatedGasCryptoBaseUnit,
    feeAsset,
    foxyApi,
    getWithdrawGasEstimate,
    onNext,
    poll,
    rewardId,
    state?.withdraw,
    toast,
    translate,
    userAddress,
    walletState.wallet,
  ])

  const hasEnoughBalanceForGas = useMemo(
    () =>
      isSome(estimatedGasCryptoBaseUnit) &&
      isSome(accountId) &&
      canCoverTxFees({
        feeAsset,
        estimatedGasCryptoPrecision,
        accountId,
      }),
    [estimatedGasCryptoBaseUnit, accountId, feeAsset, estimatedGasCryptoPrecision],
  )

  const preFooter = useMemo(
    () => (
      <ApprovePreFooter
        accountId={accountId}
        action={DefiAction.Withdraw}
        feeAsset={feeAsset}
        estimatedGasCryptoPrecision={estimatedGasCryptoPrecision}
      />
    ),
    [accountId, feeAsset, estimatedGasCryptoPrecision],
  )

  const handleCancel = useCallback(() => onNext(DefiStep.Info), [onNext])

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
        .times(feeMarketData.price)
        .toFixed(2)}
      loading={state.loading}
      preFooter={preFooter}
      onCancel={handleCancel}
      onConfirm={handleApprove}
      spenderContractAddress={contractAddress}
    />
  )
}
