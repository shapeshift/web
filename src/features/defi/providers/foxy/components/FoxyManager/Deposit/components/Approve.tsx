import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { Approve as ReusableApprove } from 'features/defi/components/Approve/Approve'
import { ApprovePreFooter } from 'features/defi/components/Approve/ApprovePreFooter'
import type { DepositValues } from 'features/defi/components/Deposit/Deposit'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxy } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
import { canCoverTxFees } from 'features/defi/helpers/utils'
import { useFoxyDeposit } from 'features/defi/providers/foxy/components/FoxyManager/Deposit/components/useFoxyDeposit'
import { useCallback, useContext, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { poll } from 'lib/poll/poll'
import { isSome } from 'lib/utils'
import { selectBIP44ParamsByAccountId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxyDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

const moduleLogger = logger.child({ namespace: ['FoxyDeposit:Approve'] })

type ApproveProps = StepComponentProps & { accountId: AccountId | undefined }

export const Approve: React.FC<ApproveProps> = ({ accountId, onNext }) => {
  const { foxy: api } = useFoxy()
  const { state, dispatch } = useContext(DepositContext)
  const estimatedGasCrypto = state?.approve.estimatedGasCrypto
  const history = useHistory()
  const translate = useTranslate()
  const toast = useToast()
  const { assetReference, feeMarketData, contractAddress, asset, feeAsset } = useFoxyDeposit()

  // user info
  const { state: walletState } = useWallet()

  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : null),
    [accountId],
  )
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))

  const getDepositGasEstimate = useCallback(
    async (deposit: DepositValues) => {
      if (!accountAddress || !assetReference || !api) return
      try {
        const [gasLimit, gasPrice] = await Promise.all([
          api.estimateDepositGas({
            tokenContractAddress: assetReference,
            contractAddress,
            amountDesired: bnOrZero(deposit.cryptoAmount)
              .times(`1e+${asset.precision}`)
              .decimalPlaces(0),
            userAddress: accountAddress,
          }),
          api.getGasPrice(),
        ])
        return bnOrZero(gasPrice).times(gasLimit).toFixed(0)
      } catch (error) {
        moduleLogger.error(
          { fn: 'getDepositGasEstimate', error },
          'Error getting deposit gas estimate',
        )
        toast({
          position: 'top-right',
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
      }
    },
    [api, asset.precision, assetReference, contractAddress, accountAddress, toast, translate],
  )

  const handleApprove = useCallback(async () => {
    if (
      !(
        assetReference &&
        accountAddress &&
        walletState.wallet &&
        api &&
        dispatch &&
        bip44Params &&
        state
      )
    )
      return
    try {
      dispatch({ type: FoxyDepositActionType.SET_LOADING, payload: true })
      await api.approve({
        tokenContractAddress: assetReference,
        contractAddress,
        userAddress: accountAddress,
        wallet: walletState.wallet,
        amount: bn(
          bnOrZero(state?.deposit.cryptoAmount).times(bn(10).pow(asset.precision)).integerValue(),
        ).toFixed(),
        bip44Params,
      })
      await poll({
        fn: () =>
          api.allowance({
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
      const estimatedGasCrypto = await getDepositGasEstimate(state?.deposit)
      if (!estimatedGasCrypto) return
      dispatch({
        type: FoxyDepositActionType.SET_DEPOSIT,
        payload: { estimatedGasCrypto },
      })

      onNext(DefiStep.Confirm)
    } catch (error) {
      moduleLogger.error({ fn: 'handleApprove', error }, 'Error on approval')
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
    accountAddress,
    api,
    asset.precision,
    assetReference,
    bip44Params,
    contractAddress,
    dispatch,
    getDepositGasEstimate,
    onNext,
    state,
    toast,
    translate,
    walletState.wallet,
  ])

  const hasEnoughBalanceForGas = useMemo(
    () =>
      isSome(accountId) &&
      isSome(estimatedGasCrypto) &&
      canCoverTxFees({
        feeAsset,
        estimatedGasCrypto,
        accountId,
      }),
    [accountId, feeAsset, estimatedGasCrypto],
  )

  const preFooter = useMemo(
    () => (
      <ApprovePreFooter
        accountId={accountId}
        action={DefiAction.Deposit}
        feeAsset={feeAsset}
        estimatedGasCrypto={estimatedGasCrypto}
      />
    ),
    [accountId, feeAsset, estimatedGasCrypto],
  )

  if (!state || !dispatch) return null

  return (
    <ReusableApprove
      asset={asset}
      feeAsset={feeAsset}
      cryptoEstimatedGasFee={bnOrZero(estimatedGasCrypto)
        .div(bn(10).pow(feeAsset.precision))
        .toFixed(5)}
      disabled={!hasEnoughBalanceForGas}
      fiatEstimatedGasFee={bnOrZero(estimatedGasCrypto)
        .div(bn(10).pow(feeAsset.precision))
        .times(feeMarketData.price)
        .toFixed(2)}
      loading={state.loading}
      loadingText={translate('common.approve')}
      learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
      preFooter={preFooter}
      isExactAllowance={state.isExactAllowance}
      onCancel={() => history.push('/')}
      onConfirm={handleApprove}
      contractAddress={contractAddress}
      onToggle={() =>
        dispatch({
          type: FoxyDepositActionType.SET_IS_EXACT_ALLOWANCE,
          payload: !state.isExactAllowance,
        })
      }
    />
  )
}
