import { useToast } from '@chakra-ui/react'
import { toAssetId } from '@shapeshiftoss/caip'
import { Deposit as ReusableDeposit, DepositValues } from 'features/defi/components/Deposit/Deposit'
import {
  DefiAction,
  DefiParams,
  DefiQueryParams,
  DefiStep,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import qs from 'qs'
import { useCallback, useContext } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { StepComponentProps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { YearnDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

const moduleLogger = logger.child({ namespace: ['YearnDeposit:Deposit'] })

export const Deposit: React.FC<StepComponentProps> = ({ onNext }) => {
  const { state, dispatch } = useContext(DepositContext)
  const history = useHistory()
  const translate = useTranslate()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { yearn: yearnInvestor } = useYearn()
  const { chainId, assetReference } = query
  const opportunity = state?.opportunity

  const assetNamespace = 'erc20'
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  // user info
  const balance = useAppSelector(state => selectPortfolioCryptoBalanceByAssetId(state, { assetId }))

  // notify
  const toast = useToast()

  const handleContinue = useCallback(
    async (formValues: DepositValues) => {
      if (!(state && dispatch && state.userAddress && opportunity)) return

      const getApproveGasEstimate = async (): Promise<string | undefined> => {
        if (!(state.userAddress && assetReference && opportunity)) return
        try {
          const yearnOpportunity = await yearnInvestor?.findByOpportunityId(
            state.opportunity?.positionAsset.assetId ?? '',
          )
          if (!yearnOpportunity) throw new Error('No opportunity')
          const preparedApproval = await yearnOpportunity.prepareApprove(state.userAddress)
          return bnOrZero(preparedApproval.gasPrice)
            .times(preparedApproval.estimatedGas)
            .integerValue()
            .toString()
        } catch (error) {
          moduleLogger.error(
            { fn: 'getApproveEstimate', error },
            'Error getting deposit approval gas estimate',
          )
          toast({
            position: 'top-right',
            description: translate('common.somethingWentWrongBody'),
            title: translate('common.somethingWentWrong'),
            status: 'error',
          })
        }
      }

      const getDepositGasEstimate = async (deposit: DepositValues): Promise<string | undefined> => {
        if (!(state.userAddress && state.opportunity && assetReference && yearnInvestor)) return
        try {
          const yearnOpportunity = await yearnInvestor.findByOpportunityId(
            state.opportunity?.positionAsset.assetId ?? '',
          )
          if (!yearnOpportunity) throw new Error('No opportunity')
          const preparedTx = await yearnOpportunity.prepareDeposit({
            amount: bnOrZero(deposit.cryptoAmount).times(`1e+${asset.precision}`).integerValue(),
            address: state.userAddress,
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
      }

      // set deposit state for future use
      dispatch({ type: YearnDepositActionType.SET_DEPOSIT, payload: formValues })
      dispatch({ type: YearnDepositActionType.SET_LOADING, payload: true })
      try {
        // Check is approval is required for user address
        const yearnOpportunity = await yearnInvestor?.findByOpportunityId(
          state.opportunity?.positionAsset.assetId ?? '',
        )
        if (!yearnOpportunity) throw new Error('No opportunity')
        const _allowance = await yearnOpportunity.allowance(state.userAddress)
        const allowance = bnOrZero(_allowance).div(bn(10).pow(asset.precision))

        // Skip approval step if user allowance is greater than or equal requested deposit amount
        if (allowance.gte(formValues.cryptoAmount)) {
          const estimatedGasCrypto = await getDepositGasEstimate(formValues)
          if (!estimatedGasCrypto) return
          dispatch({
            type: YearnDepositActionType.SET_DEPOSIT,
            payload: { estimatedGasCrypto },
          })
          onNext(DefiStep.Confirm)
          dispatch({ type: YearnDepositActionType.SET_LOADING, payload: false })
        } else {
          const estimatedGasCrypto = await getApproveGasEstimate()
          if (!estimatedGasCrypto) return
          dispatch({
            type: YearnDepositActionType.SET_APPROVE,
            payload: { estimatedGasCrypto },
          })
          onNext(DefiStep.Approve)
          dispatch({ type: YearnDepositActionType.SET_LOADING, payload: false })
        }
      } catch (error) {
        moduleLogger.error({ fn: 'handleContinue', error }, 'Error on continue')
        toast({
          position: 'top-right',
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
        dispatch({ type: YearnDepositActionType.SET_LOADING, payload: false })
      }
    },
    [
      asset.precision,
      assetReference,
      dispatch,
      onNext,
      opportunity,
      state,
      toast,
      translate,
      yearnInvestor,
    ],
  )

  if (!state || !dispatch) return null

  const handleCancel = browserHistory.goBack

  const validateCryptoAmount = (value: string) => {
    const crypto = bnOrZero(balance).div(bn(10).pow(asset.precision))
    const _value = bnOrZero(value)
    const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const validateFiatAmount = (value: string) => {
    const crypto = bnOrZero(balance).div(bn(10).pow(asset.precision))
    const fiat = crypto.times(marketData.price)
    const _value = bnOrZero(value)
    const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const cryptoAmountAvailable = bnOrZero(balance).div(bn(10).pow(asset.precision))
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailable).times(marketData.price)

  const handleBack = () => {
    history.push({
      pathname: `/defi/earn`,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }

  return (
    <ReusableDeposit
      asset={asset}
      apy={String(opportunity?.metadata.apy?.net_apy)}
      cryptoAmountAvailable={cryptoAmountAvailable.toPrecision()}
      cryptoInputValidation={{
        required: true,
        validate: { validateCryptoAmount },
      }}
      fiatAmountAvailable={fiatAmountAvailable.toFixed(2)}
      fiatInputValidation={{
        required: true,
        validate: { validateFiatAmount },
      }}
      marketData={marketData}
      onCancel={handleCancel}
      onContinue={handleContinue}
      onBack={handleBack}
      percentOptions={[0.25, 0.5, 0.75, 1]}
      enableSlippage={false}
      isLoading={state.loading}
    />
  )
}
