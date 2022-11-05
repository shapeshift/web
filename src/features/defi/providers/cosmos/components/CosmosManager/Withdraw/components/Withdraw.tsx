import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@keepkey/caip'
import { toAssetId } from '@keepkey/caip'
import { WithdrawType } from '@keepkey/types'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { getFormFees } from 'plugins/cosmos/utils'
import { useCallback, useContext, useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import {
  selectAssetById,
  selectDelegationCryptoAmountByAssetIdAndValidator,
  selectMarketDataById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

import { CosmosWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

export type CosmosWithdrawValues = {
  [Field.WithdrawType]: WithdrawType
} & WithdrawValues

const moduleLogger = logger.child({ namespace: ['CosmosWithdraw:Withdraw'] })

type WithdrawProps = StepComponentProps & {
  accountId: Nullable<AccountId>
  onAccountIdChange: AccountDropdownProps['onChange']
}
export const Withdraw: React.FC<WithdrawProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
  onNext,
}) => {
  const { state, dispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetReference, contractAddress } = query
  const toast = useToast()

  const methods = useForm<CosmosWithdrawValues>({ mode: 'onChange' })
  const { setValue, watch } = methods

  const withdrawTypeValue = watch(Field.WithdrawType)

  const assetNamespace = 'slip44' // TODO: add to query, why do we hardcode this?
  // Reward Asset info
  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference, // TODO: different denom asset reference
  })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  // Staking Asset Info
  const stakingAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))

  const filter = useMemo(
    () => ({
      accountId: accountId ?? '',
      validatorAddress: contractAddress,
      assetId,
    }),
    [accountId, assetId, contractAddress],
  )
  const cryptoStakeBalance = useAppSelector(s =>
    selectDelegationCryptoAmountByAssetIdAndValidator(s, filter),
  )
  const cryptoStakeBalanceHuman = bnOrZero(cryptoStakeBalance).div(`1e+${asset?.precision}`)

  const fiatStakeAmountHuman = cryptoStakeBalanceHuman.times(bnOrZero(marketData.price)).toString()

  const handleCancel = useCallback(() => {
    browserHistory.goBack()
  }, [browserHistory])

  const handlePercentClick = useCallback(
    (percent: number) => {
      const cryptoAmount = bnOrZero(cryptoStakeBalanceHuman)
        .times(percent)
        .dp(asset.precision, BigNumber.ROUND_DOWN)
      const fiatAmount = bnOrZero(cryptoAmount).times(marketData.price)
      setValue(Field.FiatAmount, fiatAmount.toString(), {
        shouldValidate: true,
      })
      setValue(Field.CryptoAmount, cryptoAmount.toString(), {
        shouldValidate: true,
      })
    },
    [asset.precision, cryptoStakeBalanceHuman, marketData.price, setValue],
  )

  const handleContinue = useCallback(
    async (formValues: CosmosWithdrawValues) => {
      if (!state) return

      const getWithdrawGasEstimate = async () => {
        if (!state.userAddress) return

        const { gasLimit, gasPrice } = await getFormFees(asset, marketData.price)

        try {
          return bnOrZero(gasPrice).times(gasLimit).toFixed(0)
        } catch (error) {
          moduleLogger.error(
            { fn: 'getWithdrawGasEstimate', error },
            'Error getting deposit gas estimate',
          )
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
      }

      if (!state?.userAddress || !dispatch) return
      // set withdraw state for future use
      dispatch({
        type: CosmosWithdrawActionType.SET_WITHDRAW,
        payload: formValues,
      })
      dispatch({
        type: CosmosWithdrawActionType.SET_LOADING,
        payload: true,
      })
      try {
        const estimatedGasCrypto = await getWithdrawGasEstimate()

        if (!estimatedGasCrypto) return
        dispatch({
          type: CosmosWithdrawActionType.SET_WITHDRAW,
          payload: { estimatedGasCrypto },
        })
        onNext(DefiStep.Confirm)
        dispatch({
          type: CosmosWithdrawActionType.SET_LOADING,
          payload: false,
        })
      } catch (error) {
        moduleLogger.error({ fn: 'handleContinue', error }, 'Error with withdraw')
        dispatch({
          type: CosmosWithdrawActionType.SET_LOADING,
          payload: false,
        })
        toast({
          position: 'top-right',
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
      }
    },
    [dispatch, asset, marketData.price, onNext, state, toast, translate],
  )

  if (!state || !dispatch) return null

  const validateCryptoAmount = (value: string) => {
    const crypto = bnOrZero(bn(cryptoStakeBalance).div(`1e+${asset.precision}`))
    const _value = bnOrZero(value)
    const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const validateFiatAmount = (value: string) => {
    const crypto = bnOrZero(bn(cryptoStakeBalance).div(`1e+${asset.precision}`))
    const fiat = crypto.times(bnOrZero(marketData?.price))
    const _value = bnOrZero(value)
    const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  return (
    <FormProvider {...methods}>
      <ReusableWithdraw
        accountId={accountId}
        onAccountIdChange={handleAccountIdChange}
        asset={stakingAsset}
        cryptoAmountAvailable={cryptoStakeBalanceHuman.toString()}
        cryptoInputValidation={{
          required: true,
          validate: { validateCryptoAmount },
        }}
        fiatAmountAvailable={fiatStakeAmountHuman.toString()}
        fiatInputValidation={{
          required: true,
          validate: { validateFiatAmount },
        }}
        marketData={marketData}
        onCancel={handleCancel}
        onContinue={handleContinue}
        isLoading={state.loading}
        handlePercentClick={handlePercentClick}
        disableInput={withdrawTypeValue === WithdrawType.INSTANT}
        percentOptions={[0.25, 0.5, 0.75, 1]}
      />
    </FormProvider>
  )
}
