import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import type { DepositValues } from 'features/defi/components/Deposit/Deposit'
import { Deposit as ReusableDeposit, Field } from 'features/defi/components/Deposit/Deposit'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { getFeeData } from 'plugins/cosmos/utils'
import { useCallback, useContext, useMemo } from 'react'
import type { UseFormSetValue } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { estimateFees } from 'components/Modals/Send/utils'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { toValidatorId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectStakingOpportunityByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { CosmosDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

type DepositProps = StepComponentProps & {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

const percentOptions = [0.25, 0.5, 0.75, 1]

export const Deposit: React.FC<DepositProps> = ({
  onNext,
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const { state, dispatch } = useContext(DepositContext)
  const history = useHistory()
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetReference, contractAddress } = query
  const assetNamespace = 'slip44'
  const assets = useAppSelector(selectAssets)
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })

  const validatorId = toValidatorId({ chainId, account: contractAddress })

  const opportunityMetadataFilter = useMemo(() => ({ validatorId }), [validatorId])

  const opportunityMetadata = useAppSelector(state =>
    selectStakingOpportunityByFilter(state, opportunityMetadataFilter),
  )

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)

  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))

  const apy = useMemo(() => state?.apy ?? '', [state])

  // user info
  const filter = useMemo(() => ({ assetId, accountId: accountId ?? '' }), [assetId, accountId])
  const balance = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, filter),
  )

  // notify
  const toast = useToast()

  const amountAvailableCryptoPrecision = useMemo(
    () => bnOrZero(balance).div(`1e${asset.precision}`),
    [asset.precision, balance],
  )
  const fiatAmountAvailable = useMemo(
    () => bnOrZero(amountAvailableCryptoPrecision).times(marketData.price),
    [amountAvailableCryptoPrecision, marketData.price],
  )

  const handleMaxClick = useCallback(
    async (setValue: UseFormSetValue<DepositValues>) => {
      if (!accountId) return
      const estimatedFees = await estimateFees({
        amountCryptoPrecision: amountAvailableCryptoPrecision.toString(),
        assetId,
        to: '',
        sendMax: true,
        accountId,
        contractAddress: '',
      })
      const amountAvailableCryptoBaseUnit = toBaseUnit(
        amountAvailableCryptoPrecision,
        asset.precision,
      )
      const cryptoAmountHuman = bnOrZero(amountAvailableCryptoBaseUnit)
        .minus(estimatedFees.average.txFee)
        .div(bn(10).pow(asset.precision))
        .toString()
      const fiatAmount = bnOrZero(cryptoAmountHuman).times(marketData.price)
      setValue(Field.FiatAmount, fiatAmount.toString(), {
        shouldValidate: true,
      })
      setValue(Field.CryptoAmount, cryptoAmountHuman.toString(), {
        shouldValidate: true,
      })
    },
    [accountId, asset.precision, assetId, amountAvailableCryptoPrecision, marketData.price],
  )

  const handleContinue = useCallback(
    async (formValues: DepositValues) => {
      if (!(state && dispatch && opportunityMetadata)) return

      // set deposit state for future use
      dispatch({ type: CosmosDepositActionType.SET_DEPOSIT, payload: formValues })
      dispatch({ type: CosmosDepositActionType.SET_LOADING, payload: true })
      try {
        const { txFee } = await getFeeData(asset)

        dispatch({
          type: CosmosDepositActionType.SET_DEPOSIT,
          payload: { estimatedGasCryptoBaseUnit: txFee },
        })
        onNext(DefiStep.Confirm)
        dispatch({ type: CosmosDepositActionType.SET_LOADING, payload: false })
        trackOpportunityEvent(
          MixPanelEvent.DepositContinue,
          {
            opportunity: opportunityMetadata,
            fiatAmounts: [formValues.fiatAmount],
            cryptoAmounts: [{ assetId, amountCryptoHuman: formValues.cryptoAmount }],
          },
          assets,
        )
      } catch (error) {
        console.error(error)
        toast({
          position: 'top-right',
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
        dispatch({ type: CosmosDepositActionType.SET_LOADING, payload: false })
      }
    },
    [asset, assetId, assets, dispatch, onNext, opportunityMetadata, state, toast, translate],
  )

  const handleCancel = history.goBack

  const validateCryptoAmount = useCallback(
    (value: string) => {
      const crypto = bnOrZero(balance).div(`1e+${asset.precision}`)
      const _value = bnOrZero(value)
      const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [asset.precision, balance],
  )

  const validateFiatAmount = useCallback(
    (value: string) => {
      const crypto = bnOrZero(balance).div(`1e+${asset.precision}`)
      const fiat = crypto.times(marketData.price)
      const _value = bnOrZero(value)
      const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [asset.precision, balance, marketData.price],
  )

  const cryptoInputValidation = useMemo(
    () => ({
      required: true,
      validate: { validateCryptoAmount },
    }),
    [validateCryptoAmount],
  )

  const fiatInputValidation = useMemo(
    () => ({
      required: true,
      validate: { validateFiatAmount },
    }),
    [validateFiatAmount],
  )

  if (!state || !dispatch) return null

  return (
    <ReusableDeposit
      accountId={accountId}
      onAccountIdChange={handleAccountIdChange}
      asset={asset}
      isLoading={state.loading}
      apy={apy}
      cryptoAmountAvailable={amountAvailableCryptoPrecision.toPrecision()}
      cryptoInputValidation={cryptoInputValidation}
      fiatAmountAvailable={fiatAmountAvailable.toFixed(2, BigNumber.ROUND_DOWN)}
      fiatInputValidation={fiatInputValidation}
      marketData={marketData}
      onCancel={handleCancel}
      onContinue={handleContinue}
      onMaxClick={handleMaxClick}
      percentOptions={percentOptions}
      enableSlippage={false}
    />
  )
}
