import { useToast } from '@chakra-ui/react'
import { toAssetId } from '@shapeshiftoss/caip'
import { Deposit as ReusableDeposit, DepositValues } from 'features/defi/components/Deposit/Deposit'
import {
  DefiAction,
  DefiParams,
  DefiQueryParams,
  DefiSteps,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import qs from 'qs'
import { useContext, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { YearnDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

type YearnDepositProps = {
  getDepositGasEstimate: (deposit: DepositValues) => Promise<string | undefined>
  onNext: (arg: DefiSteps) => void
}

export const Deposit = ({ getDepositGasEstimate, onNext }: YearnDepositProps) => {
  const { state, dispatch } = useContext(DepositContext)
  const [isLoading, setIsLoading] = useState(false)
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

  if (!state || !dispatch) return null

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
      console.error('YearnDeposit:getApproveEstimate error:', error)
      toast({
        position: 'top-right',
        description: translate('common.somethingWentWrongBody'),
        title: translate('common.somethingWentWrong'),
        status: 'error',
      })
    }
  }

  const handleContinue = async (formValues: DepositValues) => {
    if (!(state.userAddress && opportunity)) return
    // set deposit state for future use
    setIsLoading(true)
    dispatch({ type: YearnDepositActionType.SET_DEPOSIT, payload: formValues })
    try {
      // Check is approval is required for user address
      const yearnOpportunity = await yearnInvestor?.findByOpportunityId(
        state.opportunity?.positionAsset.assetId ?? '',
      )
      if (!yearnOpportunity) throw new Error('No opportunity')
      const _allowance = await yearnOpportunity.allowance(state.userAddress)
      const allowance = bnOrZero(_allowance).div(`1e+${asset.precision}`)

      // Skip approval step if user allowance is greater than requested deposit amount
      if (allowance.gt(formValues.cryptoAmount)) {
        const estimatedGasCrypto = await getDepositGasEstimate(formValues)
        if (!estimatedGasCrypto) return
        dispatch({
          type: YearnDepositActionType.SET_DEPOSIT,
          payload: { estimatedGasCrypto },
        })
        onNext(DefiSteps.Confirm)
        setIsLoading(false)
        //history.push(DepositPath.Confirm)
      } else {
        const estimatedGasCrypto = await getApproveGasEstimate()
        if (!estimatedGasCrypto) return
        dispatch({
          type: YearnDepositActionType.SET_APPROVE,
          payload: { estimatedGasCrypto },
        })
        onNext(DefiSteps.Approve)
        setIsLoading(false)
        //history.push(DepositPath.Approve)
      }
    } catch (error) {
      console.error('YearnDeposit:handleContinue error:', error)
      toast({
        position: 'top-right',
        description: translate('common.somethingWentWrongBody'),
        title: translate('common.somethingWentWrong'),
        status: 'error',
      })
    }
  }

  const handleCancel = () => {
    browserHistory.goBack()
  }

  const validateCryptoAmount = (value: string) => {
    const crypto = bnOrZero(balance).div(`1e+${asset.precision}`)
    const _value = bnOrZero(value)
    const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const validateFiatAmount = (value: string) => {
    const crypto = bnOrZero(balance).div(`1e+${asset.precision}`)
    const fiat = crypto.times(marketData.price)
    const _value = bnOrZero(value)
    const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const cryptoAmountAvailable = bnOrZero(balance).div(`1e${asset.precision}`)
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
      isLoading={isLoading}
    />
  )
}
