import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@keepkey/caip'
import { fromAccountId, toAssetId } from '@keepkey/caip'
import type { DepositValues } from 'features/defi/components/Deposit/Deposit'
import { Deposit as ReusableDeposit } from 'features/defi/components/Deposit/Deposit'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxy } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
import { useCallback, useContext, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

import { FoxyDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

const moduleLogger = logger.child({ namespace: ['FoxyDeposit:Deposit'] })

type DepositProps = StepComponentProps & {
  accountId?: Nullable<AccountId>
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const Deposit: React.FC<DepositProps> = ({
  accountId,
  onNext,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const { foxy: api } = useFoxy()
  const { state, dispatch } = useContext(DepositContext)
  const history = useHistory()
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query
  const assetNamespace = 'erc20'
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const opportunity = useMemo(() => state?.foxyOpportunity, [state])

  // user info
  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : null),
    [accountId],
  )
  const filter = useMemo(() => ({ assetId, accountId: accountId ?? '' }), [assetId, accountId])
  const balance = useAppSelector(state => selectPortfolioCryptoBalanceByFilter(state, filter))

  // notify
  const toast = useToast()

  const handleContinue = useCallback(
    async (formValues: DepositValues) => {
      if (!(state && accountAddress && dispatch && api)) return

      const getApproveGasEstimate = async () => {
        if (!accountAddress || !assetReference || !api) return
        try {
          const [gasLimit, gasPrice] = await Promise.all([
            api.estimateApproveGas({
              tokenContractAddress: assetReference,
              contractAddress,
              userAddress: accountAddress,
            }),
            api.getGasPrice(),
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

      const getDepositGasEstimate = async (deposit: DepositValues) => {
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
      }

      // set deposit state for future use
      dispatch({ type: FoxyDepositActionType.SET_DEPOSIT, payload: formValues })
      dispatch({ type: FoxyDepositActionType.SET_LOADING, payload: true })
      try {
        // Check is approval is required for user address
        const _allowance = await api.allowance({
          tokenContractAddress: assetReference,
          contractAddress,
          userAddress: accountAddress,
        })
        const allowance = bnOrZero(_allowance).div(bn(10).pow(asset.precision))

        // Skip approval step if user allowance is greater than or equal requested deposit amount
        if (allowance.gte(formValues.cryptoAmount)) {
          const estimatedGasCrypto = await getDepositGasEstimate(formValues)
          if (!estimatedGasCrypto) return
          dispatch({
            type: FoxyDepositActionType.SET_DEPOSIT,
            payload: { estimatedGasCrypto },
          })
          onNext(DefiStep.Confirm)
          dispatch({ type: FoxyDepositActionType.SET_LOADING, payload: false })
        } else {
          const estimatedGasCrypto = await getApproveGasEstimate()
          if (!estimatedGasCrypto) return
          dispatch({
            type: FoxyDepositActionType.SET_APPROVE,
            payload: { estimatedGasCrypto },
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
      api,
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
