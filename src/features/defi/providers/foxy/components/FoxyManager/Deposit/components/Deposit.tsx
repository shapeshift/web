import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { DepositValues } from 'features/defi/components/Deposit/Deposit'
import { Deposit as ReusableDeposit } from 'features/defi/components/Deposit/Deposit'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxyQuery } from 'features/defi/providers/foxy/components/FoxyManager/useFoxyQuery'
import { useCallback, useContext, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { getFoxyApi } from 'state/apis/foxy/foxyApiSingleton'
import {
  selectMarketDataById,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxyDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

const moduleLogger = logger.child({ namespace: ['FoxyDeposit:Deposit'] })

type DepositProps = StepComponentProps & {
  accountId?: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const Deposit: React.FC<DepositProps> = ({
  accountId,
  onNext,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const foxyApi = getFoxyApi()
  const { state, dispatch } = useContext(DepositContext)
  const history = useHistory()
  const translate = useTranslate()
  const {
    stakingAssetId: assetId,
    contractAddress,
    stakingAssetReference: assetReference,
    stakingAsset: asset,
  } = useFoxyQuery()

  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const opportunity = useMemo(() => state?.foxyOpportunity, [state])

  // user info
  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : null),
    [accountId],
  )
  const filter = useMemo(() => ({ assetId, accountId: accountId ?? '' }), [assetId, accountId])
  const balance = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, filter),
  )

  // notify
  const toast = useToast()

  const handleContinue = useCallback(
    async (formValues: DepositValues) => {
      if (!(state && accountAddress && dispatch && foxyApi)) return

      const getApproveGasEstimate = async () => {
        if (!accountAddress || !assetReference || !foxyApi) return
        try {
          const [gasLimit, gasPrice] = await Promise.all([
            foxyApi.estimateApproveGas({
              tokenContractAddress: assetReference,
              contractAddress,
              userAddress: accountAddress,
            }),
            foxyApi.getGasPrice(),
          ])
          return bnOrZero(gasPrice).times(gasLimit).toFixed(0)
        } catch (error) {
          moduleLogger.error(
            { fn: 'getApproveEstimate', error },
            'Error getting approval gas estimate',
          )
          toast({
            position: 'top-right',
            description: translate('common.somethingWentWrongBody'),
            title: translate('common.somethingWentWrong'),
            status: 'error',
          })
        }
      }

      const getDepositGasEstimateCryptoBaseUnit = async (deposit: DepositValues) => {
        if (!accountAddress || !assetReference || !foxyApi) return
        try {
          const [gasLimit, gasPrice] = await Promise.all([
            foxyApi.estimateDepositGas({
              tokenContractAddress: assetReference,
              contractAddress,
              amountDesired: bnOrZero(deposit.cryptoAmount)
                .times(`1e+${asset.precision}`)
                .decimalPlaces(0),
              userAddress: accountAddress,
            }),
            foxyApi.getGasPrice(),
          ])
          return bnOrZero(gasPrice).times(gasLimit).toFixed(0)
        } catch (error) {
          moduleLogger.error(
            { fn: 'getDepositGasEstimateCryptoBaseUnit', error },
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
      dispatch({ type: FoxyDepositActionType.SET_DEPOSIT, payload: formValues })
      dispatch({ type: FoxyDepositActionType.SET_LOADING, payload: true })
      try {
        // Check is approval is required for user address
        const _allowance = await foxyApi.allowance({
          tokenContractAddress: assetReference,
          contractAddress,
          userAddress: accountAddress,
        })
        const allowance = bnOrZero(_allowance).div(bn(10).pow(asset.precision))

        // Skip approval step if user allowance is greater than or equal requested deposit amount
        if (allowance.gte(formValues.cryptoAmount)) {
          const estimatedGasCryptoBaseUnit = await getDepositGasEstimateCryptoBaseUnit(formValues)
          if (!estimatedGasCryptoBaseUnit) return
          dispatch({
            type: FoxyDepositActionType.SET_DEPOSIT,
            payload: { estimatedGasCryptoBaseUnit },
          })
          onNext(DefiStep.Confirm)
          dispatch({ type: FoxyDepositActionType.SET_LOADING, payload: false })
        } else {
          const estimatedGasCrypto = await getApproveGasEstimate()
          if (!estimatedGasCrypto) return
          dispatch({
            type: FoxyDepositActionType.SET_APPROVE,
            payload: { estimatedGasCryptoBaseUnit: estimatedGasCrypto },
          })
          onNext(DefiStep.Approve)
          dispatch({ type: FoxyDepositActionType.SET_LOADING, payload: false })
        }
      } catch (error) {
        moduleLogger.error({ fn: 'handleContinue', error }, 'Error on continue')
        toast({
          position: 'top-right',
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
        dispatch({ type: FoxyDepositActionType.SET_LOADING, payload: false })
      }
    },
    [
      accountAddress,
      foxyApi,
      asset.precision,
      assetReference,
      contractAddress,
      dispatch,
      onNext,
      state,
      toast,
      translate,
    ],
  )

  if (!state || !dispatch) return null

  const handleCancel = history.goBack

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

  return (
    <ReusableDeposit
      accountId={accountId}
      onAccountIdChange={handleAccountIdChange}
      asset={asset}
      isLoading={state.loading}
      apy={String(opportunity?.apy)}
      cryptoAmountAvailable={cryptoAmountAvailable.toPrecision()}
      cryptoInputValidation={{
        required: true,
        validate: { validateCryptoAmount },
      }}
      fiatAmountAvailable={fiatAmountAvailable.toFixed(2, BigNumber.ROUND_DOWN)}
      fiatInputValidation={{
        required: true,
        validate: { validateFiatAmount },
      }}
      marketData={marketData}
      onCancel={handleCancel}
      onContinue={handleContinue}
      percentOptions={[0.25, 0.5, 0.75, 1]}
      enableSlippage={false}
    />
  )
}
