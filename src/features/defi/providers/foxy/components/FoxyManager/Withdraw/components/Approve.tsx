import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@keepkey/caip'
import { ASSET_REFERENCE, toAssetId } from '@keepkey/caip'
import { Approve as ReusableApprove } from 'features/defi/components/Approve/Approve'
import { ApprovePreFooter } from 'features/defi/components/Approve/ApprovePreFooter'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxy } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
import { canCoverTxFees } from 'features/defi/helpers/utils'
import { useCallback, useContext, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { poll } from 'lib/poll/poll'
import {
  selectAssetById,
  selectBIP44ParamsByAccountId,
  selectMarketDataById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

import { FoxyWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'Foxy', 'Withdraw', 'Approve'],
})

export const Approve: React.FC<StepComponentProps & { accountId: Nullable<AccountId> }> = ({
  accountId,
  onNext,
}) => {
  const { foxy: api } = useFoxy()
  const { state, dispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, rewardId } = query
  const toast = useToast()

  const assetNamespace = 'erc20'
  // Asset info
  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference: rewardId,
  })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Ethereum,
  })
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))

  // user info
  const { state: walletState } = useWallet()

  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))

  const getWithdrawGasEstimate = useCallback(
    async (withdraw: WithdrawValues) => {
      if (!(state?.userAddress && rewardId && api && dispatch && bip44Params)) return
      try {
        const [gasLimit, gasPrice] = await Promise.all([
          api.estimateWithdrawGas({
            tokenContractAddress: rewardId,
            contractAddress,
            amountDesired: bnOrZero(
              bn(withdraw.cryptoAmount).times(`1e+${asset.precision}`),
            ).decimalPlaces(0),
            userAddress: state.userAddress,
            type: state.withdraw.withdrawType,
            bip44Params,
          }),
          api.getGasPrice(),
        ])
        const returVal = bnOrZero(bn(gasPrice).times(gasLimit)).toFixed(0)
        return returVal
      } catch (error) {
        moduleLogger.error(error, { fn: 'getWithdrawGasEstimate' }, 'getWithdrawGasEstimate error')
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
      api,
      asset.precision,
      bip44Params,
      contractAddress,
      dispatch,
      rewardId,
      state?.userAddress,
      state?.withdraw.withdrawType,
      toast,
      translate,
    ],
  )

  const handleApprove = useCallback(async () => {
    if (!(rewardId && state?.userAddress && walletState.wallet && api && dispatch && bip44Params))
      return
    try {
      dispatch({ type: FoxyWithdrawActionType.SET_LOADING, payload: true })
      await api.approve({
        tokenContractAddress: rewardId,
        contractAddress,
        userAddress: state.userAddress,
        wallet: walletState.wallet,
        bip44Params,
      })
      await poll({
        fn: () =>
          api.allowance({
            tokenContractAddress: rewardId,
            contractAddress,
            userAddress: state.userAddress!,
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
        payload: { estimatedGasCrypto },
      })
      onNext(DefiStep.Confirm)
    } catch (error) {
      moduleLogger.error(error, { fn: 'handleApprove' }, 'handleApprove error')
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
    api,
    asset.precision,
    bip44Params,
    contractAddress,
    dispatch,
    getWithdrawGasEstimate,
    onNext,
    rewardId,
    state?.userAddress,
    state?.withdraw,
    toast,
    translate,
    walletState.wallet,
  ])

  const hasEnoughBalanceForGas = useMemo(
    () => canCoverTxFees(feeAsset, state?.approve.estimatedGasCrypto),
    [feeAsset, state?.approve.estimatedGasCrypto],
  )

  const preFooter = useMemo(
    () => (
      <ApprovePreFooter
        action={DefiAction.Withdraw}
        feeAsset={feeAsset}
        estimatedGasCrypto={state?.approve.estimatedGasCrypto}
      />
    ),
    [feeAsset, state?.approve.estimatedGasCrypto],
  )

  if (!state || !dispatch) return null

  return (
    <ReusableApprove
      asset={asset}
      feeAsset={feeAsset}
      cryptoEstimatedGasFee={bnOrZero(state.approve.estimatedGasCrypto)
        .div(bn(10).pow(feeAsset.precision))
        .toFixed(5)}
      disabled={!hasEnoughBalanceForGas}
      fiatEstimatedGasFee={bnOrZero(state.approve.estimatedGasCrypto)
        .div(bn(10).pow(feeAsset.precision))
        .times(feeMarketData.price)
        .toFixed(2)}
      loading={state.loading}
      loadingText={translate('common.approve')}
      learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
      preFooter={preFooter}
      onCancel={() => onNext(DefiStep.Info)}
      onConfirm={handleApprove}
      contractAddress={contractAddress}
    />
  )
}
