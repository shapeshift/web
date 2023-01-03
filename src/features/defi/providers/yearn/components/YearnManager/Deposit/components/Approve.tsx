import { useToast } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { ssRouterContractAddress } from '@shapeshiftoss/investor-yearn'
import { Approve as ReusableApprove } from 'features/defi/components/Approve/Approve'
import { ApprovePreFooter } from 'features/defi/components/Approve/ApprovePreFooter'
import type { DepositValues } from 'features/defi/components/Deposit/Deposit'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { getYearnInvestor } from 'features/defi/contexts/YearnProvider/yearnInvestorSingleton'
import { canCoverTxFees } from 'features/defi/helpers/utils'
import { useCallback, useContext, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { poll } from 'lib/poll/poll'
import { isSome } from 'lib/utils'
import {
  selectAssetById,
  selectBIP44ParamsByAccountId,
  selectMarketDataById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { YearnDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

type YearnApprovalProps = StepComponentProps & { accountId: AccountId | undefined }

const moduleLogger = logger.child({ namespace: ['YearnDeposit:Approve'] })

export const Approve: React.FC<YearnApprovalProps> = ({ accountId, onNext }) => {
  const yearnInvestor = useMemo(() => getYearnInvestor(), [])
  const { state, dispatch } = useContext(DepositContext)
  const estimatedGasCrypto = state?.approve.estimatedGasCrypto
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetReference } = query
  const opportunity = state?.opportunity
  const chainAdapter = getChainAdapterManager().get(chainId)

  const accountFilter = useMemo(() => ({ accountId }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))
  const userAddress = useMemo(() => accountId && fromAccountId(accountId).account, [accountId])

  const assetNamespace = 'erc20'
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })
  const feeAssetId = chainAdapter?.getFeeAssetId()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const underlyingAsset: Asset | undefined = useAppSelector(state =>
    selectAssetById(state, opportunity?.underlyingAssetIds[0] ?? ''),
  )
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))

  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  if (!underlyingAsset)
    throw new Error(`Asset not found for AssetId ${opportunity?.underlyingAssetIds[0]}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)

  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId ?? ''))

  // user info
  const { state: walletState } = useWallet()

  // notify
  const toast = useToast()

  const getDepositGasEstimate = useCallback(
    async (deposit: DepositValues): Promise<string | undefined> => {
      if (!(userAddress && opportunity && assetReference && yearnInvestor && underlyingAsset))
        return
      try {
        const yearnOpportunity = await yearnInvestor.findByOpportunityId(opportunity.assetId)
        if (!yearnOpportunity) throw new Error('No opportunity')
        const preparedTx = await yearnOpportunity.prepareDeposit({
          amount: bnOrZero(deposit.cryptoAmount)
            .times(bn(10).pow(underlyingAsset?.precision))
            .integerValue(),
          address: userAddress,
        })
        // TODO: Figure out a better way for the safety factor
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
    [userAddress, opportunity, assetReference, yearnInvestor, underlyingAsset, toast, translate],
  )

  const handleApprove = useCallback(async () => {
    if (
      !(
        dispatch &&
        bip44Params &&
        assetReference &&
        userAddress &&
        walletState.wallet &&
        supportsETH(walletState.wallet) &&
        opportunity &&
        chainAdapter &&
        underlyingAsset
      )
    )
      return

    try {
      dispatch({ type: YearnDepositActionType.SET_LOADING, payload: true })
      const yearnOpportunity = await yearnInvestor.findByOpportunityId(opportunity.assetId ?? '')
      if (!yearnOpportunity) throw new Error('No opportunity')
      const tx = await yearnOpportunity.prepareApprove(userAddress)
      await yearnOpportunity.signAndBroadcast({
        wallet: walletState.wallet,
        tx,
        // TODO: allow user to choose fee priority
        feePriority: undefined,
        bip44Params,
      })
      const address = userAddress
      await poll({
        fn: () => yearnOpportunity.allowance(address),
        validate: (result: string) => {
          const allowance = bnOrZero(result).div(bn(10).pow(underlyingAsset?.precision))
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
    dispatch,
    bip44Params,
    assetReference,
    userAddress,
    walletState.wallet,
    opportunity,
    chainAdapter,
    underlyingAsset,
    yearnInvestor,
    getDepositGasEstimate,
    state?.deposit,
    onNext,
    toast,
    translate,
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

  if (!state || !dispatch || !estimatedGasCrypto) return null

  return (
    <ReusableApprove
      asset={asset}
      feeAsset={feeAsset}
      cryptoEstimatedGasFee={bnOrZero(state.approve.estimatedGasCrypto)
        .div(bn(10).pow(feeAsset?.precision))
        .toFixed(5)}
      disabled={!hasEnoughBalanceForGas}
      fiatEstimatedGasFee={bnOrZero(state.approve.estimatedGasCrypto)
        .div(bn(10).pow(feeAsset?.precision))
        .times(feeMarketData.price)
        .toFixed(2)}
      loading={state.loading}
      loadingText={translate('common.approveOnWallet')}
      preFooter={preFooter}
      providerIcon={underlyingAsset.icon}
      learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
      onCancel={() => onNext(DefiStep.Info)}
      onConfirm={handleApprove}
      contractAddress={ssRouterContractAddress}
    />
  )
}
