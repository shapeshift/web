import { Alert, AlertDescription, useColorModeValue, useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import { Approve as ReusableApprove } from 'features/defi/components/Approve/Approve'
import type { DepositValues } from 'features/defi/components/Deposit/Deposit'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxy } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
import { useCallback, useContext, useMemo } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
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
import { Nullable } from 'types/common'

import { FoxyDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

const moduleLogger = logger.child({ namespace: ['FoxyDeposit:Approve'] })

export const Approve: React.FC<StepComponentProps & { accountId: Nullable<AccountId> }> = ({
  accountId,
  onNext,
}) => {
  const { foxy: api } = useFoxy()
  const { state, dispatch } = useContext(DepositContext)
  const history = useHistory()
  const translate = useTranslate()
  const toast = useToast()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query
  const alertText = useColorModeValue('blue.800', 'white')
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

  const getDepositGasEstimate = useCallback(
    async (deposit: DepositValues) => {
      if (!state?.userAddress || !assetReference || !api) return
      try {
        const [gasLimit, gasPrice] = await Promise.all([
          api.estimateDepositGas({
            tokenContractAddress: assetReference,
            contractAddress,
            amountDesired: bnOrZero(deposit.cryptoAmount)
              .times(`1e+${asset.precision}`)
              .decimalPlaces(0),
            userAddress: state.userAddress,
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
    [api, asset.precision, assetReference, contractAddress, state?.userAddress, toast, translate],
  )

  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))

  const handleApprove = useCallback(async () => {
    if (
      !(
        assetReference &&
        state?.userAddress &&
        walletState.wallet &&
        api &&
        dispatch &&
        bip44Params
      )
    )
      return
    try {
      dispatch({ type: FoxyDepositActionType.SET_LOADING, payload: true })
      await api.approve({
        tokenContractAddress: assetReference,
        contractAddress,
        userAddress: state.userAddress,
        wallet: walletState.wallet,
        amount: bnOrZero(state.deposit.cryptoAmount).times(`1e+${asset.precision}`).toString(),
        bip44Params,
      })
      await poll({
        fn: () =>
          api.allowance({
            tokenContractAddress: assetReference,
            contractAddress,
            userAddress: state.userAddress!,
          }),
        validate: (result: string) => {
          const allowance = bnOrZero(result).div(bn(10).pow(asset.precision))
          return bnOrZero(allowance).gte(state.deposit.cryptoAmount)
        },
        interval: 15000,
        maxAttempts: 60,
      })
      // Get deposit gas estimate
      const estimatedGasCrypto = await getDepositGasEstimate(state.deposit)
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
    api,
    asset.precision,
    assetReference,
    bip44Params,
    contractAddress,
    dispatch,
    getDepositGasEstimate,
    onNext,
    state?.deposit,
    state?.userAddress,
    toast,
    translate,
    walletState.wallet,
  ])

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
      loadingText={translate('common.approve')}
      learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
      preFooter={
        <Alert status='info' borderRadius='lg' color='blue.500'>
          <FaGasPump />
          <AlertDescription textAlign='left' ml={3} color={alertText}>
            {translate('modals.approve.depositFee')}
          </AlertDescription>
        </Alert>
      }
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
