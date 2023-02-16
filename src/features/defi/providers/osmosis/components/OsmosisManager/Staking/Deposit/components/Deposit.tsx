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
import { getFormFees } from 'plugins/cosmos/utils'
import { useCallback, useContext, useMemo } from 'react'
import type { UseFormSetValue } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { estimateFees } from 'components/Modals/Send/utils'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { OsmosisStakingDepositActionType } from '../StakingDepositCommon'
import { StakingDepositContext } from '../StakingDepositContext'

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'Osmosis', 'Staking', 'Deposit', 'Deposit'],
})

type DepositProps = StepComponentProps & {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const Deposit: React.FC<DepositProps> = ({
  onNext,
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const { state, dispatch } = useContext(StakingDepositContext)
  const history = useHistory()
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)

  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const opportunity = useMemo(() => state?.osmosisOpportunity, [state])

  // user info
  const filter = useMemo(() => ({ assetId, accountId: accountId ?? '' }), [assetId, accountId])
  const balanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, filter),
  )

  // notify
  const toast = useToast()

  const amountAvailableCryptoPrecision = useMemo(
    () => bnOrZero(balanceCryptoBaseUnit).div(bn(10).pow(asset.precision)),
    [asset.precision, balanceCryptoBaseUnit],
  )
  const fiatAmountAvailable = useMemo(
    () => bnOrZero(amountAvailableCryptoPrecision).times(marketData.price),
    [amountAvailableCryptoPrecision, marketData.price],
  )

  const handleMaxClick = useCallback(
    async (setValue: UseFormSetValue<DepositValues>) => {
      if (!accountId) return
      const estimatedFees = await estimateFees({
        cryptoAmount: amountAvailableCryptoPrecision.toFixed(),
        asset,
        to: '',
        sendMax: true,
        accountId,
        contractAddress: '',
      })

      const cryptoAmountHuman = bnOrZero(amountAvailableCryptoPrecision)
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
    [accountId, asset, amountAvailableCryptoPrecision, marketData.price],
  )

  const handleContinue = useCallback(
    async (formValues: DepositValues) => {
      if (!(state && dispatch && state.accountId)) return

      const getStakingGasEstimate = async () => {
        if (!state.accountId || !assetReference) return

        const { gasLimit, gasPrice } = await getFormFees(asset, marketData.price)

        try {
          return bnOrZero(gasPrice).times(gasLimit).toFixed(0)
        } catch (error) {
          moduleLogger.error(
            { fn: 'getStakingGasEstimate', error },
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
      dispatch({ type: OsmosisStakingDepositActionType.SET_DEPOSIT, payload: formValues })
      dispatch({ type: OsmosisStakingDepositActionType.SET_LOADING, payload: true })
      try {
        const estimatedGasCrypto = await getStakingGasEstimate()
        if (!estimatedGasCrypto) return
        dispatch({
          type: OsmosisStakingDepositActionType.SET_DEPOSIT,
          payload: { estimatedGasCrypto },
        })
        onNext(DefiStep.Confirm)
        dispatch({ type: OsmosisStakingDepositActionType.SET_LOADING, payload: false })
      } catch (error) {
        moduleLogger.error({ fn: 'handleContinue', error }, 'Error on continue')
        toast({
          position: 'top-right',
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
        dispatch({ type: OsmosisStakingDepositActionType.SET_LOADING, payload: false })
      }
    },
    [asset, assetReference, dispatch, marketData.price, onNext, state, toast, translate],
  )

  if (!state || !dispatch) return null

  const handleCancel = history.goBack

  const validateCryptoAmount = (value: string) => {
    const _value = bnOrZero(value)
    const hasValidBalance =
      amountAvailableCryptoPrecision.gt(0) &&
      _value.gt(0) &&
      amountAvailableCryptoPrecision.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const validateFiatAmount = (value: string) => {
    const _value = bnOrZero(value)
    const hasValidBalance =
      fiatAmountAvailable.gt(0) && _value.gt(0) && fiatAmountAvailable.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  return (
    <ReusableDeposit
      accountId={accountId}
      onAccountIdChange={handleAccountIdChange}
      asset={asset}
      isLoading={state.loading}
      apy={String(opportunity?.apr)}
      cryptoAmountAvailable={amountAvailableCryptoPrecision.toPrecision()}
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
      onMaxClick={handleMaxClick}
      percentOptions={[0.25, 0.5, 0.75, 1]}
      enableSlippage={false}
    />
  )
}
