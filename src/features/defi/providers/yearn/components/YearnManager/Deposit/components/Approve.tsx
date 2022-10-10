import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { ssRouterContractAddress } from '@shapeshiftoss/investor-yearn'
import { Approve as ReusableApprove } from 'features/defi/components/Approve/Approve'
import type { DepositValues } from 'features/defi/components/Deposit/Deposit'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import { useCallback, useContext, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
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

import { YearnDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

type YearnApproveProps = {
  accountId?: Nullable<AccountId>
  onNext: (arg: DefiStep) => void
}

const moduleLogger = logger.child({ namespace: ['YearnDeposit:Approve'] })

export const Approve: React.FC<YearnApproveProps> = ({ accountId, onNext }) => {
  const { state, dispatch } = useContext(DepositContext)
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetReference } = query
  const { yearn: yearnInvestor } = useYearn()
  const opportunity = state?.opportunity

  const assetNamespace = 'erc20'
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Ethereum,
  })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))

  // user info
  const { state: walletState } = useWallet()

  // notify
  const toast = useToast()

  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : null),
    [accountId],
  )
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))

  const getDepositGasEstimate = useCallback(
    async (deposit: DepositValues): Promise<string | undefined> => {
      if (!(accountAddress && state?.opportunity && assetReference && yearnInvestor)) return
      try {
        const yearnOpportunity = await yearnInvestor.findByOpportunityId(
          state.opportunity?.positionAsset.assetId ?? '',
        )
        if (!yearnOpportunity) throw new Error('No opportunity')
        const preparedTx = await yearnOpportunity.prepareDeposit({
          amount: bnOrZero(deposit.cryptoAmount).times(`1e+${asset.precision}`).integerValue(),
          address: accountAddress,
        })
        // TODO(theobold): Figure out a better way for the safety factor
        return bnOrZero(preparedTx.gasPrice)
          .times(preparedTx.estimatedGas)
          .integerValue()
          .toString()
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
    [
      accountAddress,
      asset?.precision,
      assetReference,
      state?.opportunity,
      toast,
      translate,
      yearnInvestor,
    ],
  )

  const handleApprove = useCallback(async () => {
    if (
      !(
        assetReference &&
        dispatch &&
        bip44Params &&
        accountAddress &&
        walletState.wallet &&
        supportsETH(walletState.wallet) &&
        opportunity
      )
    )
      return

    try {
      dispatch({ type: YearnDepositActionType.SET_LOADING, payload: true })
      const yearnOpportunity = await yearnInvestor?.findByOpportunityId(
        state.opportunity?.positionAsset.assetId ?? '',
      )
      if (!yearnOpportunity) throw new Error('No opportunity')
      const tx = await yearnOpportunity.prepareApprove(
        accountAddress,
        state.isExactAllowance
          ? bnOrZero(state.deposit.cryptoAmount).times(`1e+${asset.precision}`).toString()
          : undefined,
      )
      await yearnOpportunity.signAndBroadcast({
        wallet: walletState.wallet,
        tx,
        // TODO: allow user to choose fee priority
        feePriority: undefined,
        bip44Params,
      })
      const address = accountAddress
      await poll({
        fn: () => yearnOpportunity.allowance(address),
        validate: (result: string) => {
          const allowance = bnOrZero(result).div(bn(10).pow(asset.precision))
          return bnOrZero(allowance).gte(state.deposit.cryptoAmount)
        },
        interval: 15000,
        maxAttempts: 30,
      })
      // Get deposit gas estimate
      const estimatedGasCrypto = await getDepositGasEstimate(state.deposit)
      if (!estimatedGasCrypto) return
      dispatch({
        type: YearnDepositActionType.SET_DEPOSIT,
        payload: { estimatedGasCrypto },
      })

      onNext(DefiStep.Confirm)
    } catch (error) {
      moduleLogger.error({ fn: 'handleApprove', error }, 'Error getting approval gas estimate')
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error',
      })
    } finally {
      dispatch({ type: YearnDepositActionType.SET_LOADING, payload: false })
    }
  }, [
    getDepositGasEstimate,
    state?.opportunity?.positionAsset.assetId,
    asset?.precision,
    assetReference,
    bip44Params,
    dispatch,
    onNext,
    opportunity,
    state?.deposit,
    state?.isExactAllowance,
    accountAddress,
    toast,
    translate,
    walletState?.wallet,
    yearnInvestor,
  ])

  const handleToggle = useCallback(() => {
    if (!(dispatch && state)) return

    dispatch({
      type: YearnDepositActionType.SET_IS_EXACT_ALLOWANCE,
      payload: !state.isExactAllowance,
    })
  }, [dispatch, state])

  const handleCancel = useCallback(() => onNext(DefiStep.Info), [onNext])

  if (!state || !dispatch) return null

  return (
    <ReusableApprove
      asset={asset}
      feeAsset={feeAsset}
      cryptoEstimatedGasFee={bnOrZero(state.approve.estimatedGasCrypto)
        .div(bn(10).pow(feeAsset.precision))
        .toFixed(5)}
      disableAction
      fiatEstimatedGasFee={bnOrZero(state.approve.estimatedGasCrypto)
        .div(bn(10).pow(feeAsset.precision))
        .times(feeMarketData.price)
        .toFixed(2)}
      loading={state.loading}
      isExactAllowance={state.isExactAllowance}
      onToggle={handleToggle}
      loadingText={translate('common.approveOnWallet')}
      providerIcon='https://assets.coincap.io/assets/icons/256/fox.png'
      learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
      onCancel={handleCancel}
      onConfirm={handleApprove}
      contractAddress={ssRouterContractAddress}
    />
  )
}
