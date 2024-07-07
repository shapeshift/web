import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import { WithdrawType } from '@shapeshiftoss/types'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { getFeeData } from 'plugins/cosmos/utils'
import { useCallback, useContext, useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { serializeUserStakingId, toValidatorId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectMarketDataByAssetIdUserCurrency,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { CosmosWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

export type CosmosWithdrawValues = {
  [Field.WithdrawType]: WithdrawType
} & WithdrawValues

type WithdrawProps = StepComponentProps & {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

const percentOptions = [0.25, 0.5, 0.75, 1]

export const Withdraw: React.FC<WithdrawProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
  onNext,
}) => {
  const { state, dispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetReference, contractAddress: validatorAddress } = query
  const toast = useToast()

  const methods = useForm<CosmosWithdrawValues>({ mode: 'onChange' })
  const { setValue, watch } = methods

  const withdrawTypeValue = watch(Field.WithdrawType)

  const assets = useAppSelector(selectAssets)
  const assetNamespace = 'slip44' // TODO: add to query, why do we hardcode this?
  // Reward Asset info
  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference, // TODO: different denom asset reference
  })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)

  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))

  // Staking Asset Info
  const stakingAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  if (!stakingAsset) throw new Error(`Asset not found for AssetId ${stakingAssetId}`)

  const validatorId = toValidatorId({ chainId, account: validatorAddress })

  const opportunityDataFilter = useMemo(() => {
    if (!accountId) return
    const userStakingId = serializeUserStakingId(accountId, validatorId)
    return { userStakingId }
  }, [accountId, validatorId])

  const earnOpportunityData = useAppSelector(state =>
    opportunityDataFilter
      ? selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter)
      : undefined,
  )
  const cryptoStakeBalanceHuman = bnOrZero(earnOpportunityData?.stakedAmountCryptoBaseUnit).div(
    bn(10).pow(asset.precision),
  )

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
      if (!dispatch) return
      if (!state || !earnOpportunityData) return

      // set withdraw state for future use
      dispatch({ type: CosmosWithdrawActionType.SET_WITHDRAW, payload: formValues })
      dispatch({ type: CosmosWithdrawActionType.SET_LOADING, payload: true })
      try {
        const { txFee } = await getFeeData(asset)

        dispatch({
          type: CosmosWithdrawActionType.SET_WITHDRAW,
          payload: { estimatedGasCryptoBaseUnit: txFee },
        })
        onNext(DefiStep.Confirm)
        dispatch({
          type: CosmosWithdrawActionType.SET_LOADING,
          payload: false,
        })
        trackOpportunityEvent(
          MixPanelEvent.WithdrawContinue,
          {
            opportunity: earnOpportunityData,
            fiatAmounts: [formValues.fiatAmount],
            cryptoAmounts: [{ assetId, amountCryptoHuman: formValues.cryptoAmount }],
          },
          assets,
        )
      } catch (error) {
        console.error(error)
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
    [state, dispatch, asset, toast, translate, onNext, earnOpportunityData, assetId, assets],
  )

  const validateCryptoAmount = useCallback(
    (value: string) => {
      const crypto = bnOrZero(earnOpportunityData?.stakedAmountCryptoBaseUnit).div(
        bn(10).pow(asset.precision),
      )
      const _value = bnOrZero(value)
      const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [asset.precision, earnOpportunityData?.stakedAmountCryptoBaseUnit],
  )

  const validateFiatAmount = useCallback(
    (value: string) => {
      const crypto = bnOrZero(earnOpportunityData?.stakedAmountCryptoBaseUnit).div(
        bn(10).pow(asset.precision),
      )
      const fiat = crypto.times(bnOrZero(marketData?.price))
      const _value = bnOrZero(value)
      const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [asset.precision, earnOpportunityData?.stakedAmountCryptoBaseUnit, marketData?.price],
  )

  const fiatInputValidation = useMemo(
    () => ({
      required: true,
      validate: { validateFiatAmount },
    }),
    [validateFiatAmount],
  )

  const cryptoInputValidation = useMemo(
    () => ({
      required: true,
      validate: { validateCryptoAmount },
    }),
    [validateCryptoAmount],
  )

  if (!state || !dispatch) return null

  return (
    <FormProvider {...methods}>
      <ReusableWithdraw
        accountId={accountId}
        onAccountIdChange={handleAccountIdChange}
        asset={stakingAsset}
        cryptoAmountAvailable={cryptoStakeBalanceHuman.toString()}
        cryptoInputValidation={cryptoInputValidation}
        fiatAmountAvailable={fiatStakeAmountHuman.toString()}
        fiatInputValidation={fiatInputValidation}
        marketData={marketData}
        onCancel={handleCancel}
        onContinue={handleContinue}
        isLoading={state.loading}
        handlePercentClick={handlePercentClick}
        disableInput={withdrawTypeValue === WithdrawType.INSTANT}
        percentOptions={percentOptions}
      />
    </FormProvider>
  )
}
