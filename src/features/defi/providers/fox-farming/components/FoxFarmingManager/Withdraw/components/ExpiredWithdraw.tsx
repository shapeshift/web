import { Stack } from '@chakra-ui/react'
import { ethAssetId, foxAssetId } from '@keepkey/caip'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxFarming } from 'features/defi/providers/fox-farming/hooks/useFoxFarming'
import { useContext } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Text } from 'components/Text'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxFarmingWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

const moduleLogger = logger.child({
  namespace: ['Providers', 'FoxFarming', 'FoxFarmingManager', 'Withdraw', 'ExpiredWithdraw'],
})

export const ExpiredWithdraw: React.FC<StepComponentProps> = ({ onNext }) => {
  const { state, dispatch } = useContext(WithdrawContext)
  const { history: browserHistory, query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { contractAddress } = query
  const opportunity = state?.opportunity
  const { getUnstakeGasData, allowance, getApproveGasData } = useFoxFarming(contractAddress)
  const { setAccountId: handleAccountIdChange } = useFoxEth()

  const methods = useForm<WithdrawValues>({ mode: 'onChange' })

  const asset = useAppSelector(state => selectAssetById(state, opportunity?.assetId ?? ''))
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const foxAsset = useAppSelector(state => selectAssetById(state, foxAssetId))

  // user info
  const cryptoAmountAvailable = bnOrZero(opportunity?.cryptoAmount)
  const totalFiatBalance = opportunity?.fiatAmount

  if (!state || !dispatch || !opportunity || !totalFiatBalance) return null

  const getWithdrawGasEstimate = async () => {
    try {
      const fee = await getUnstakeGasData(cryptoAmountAvailable.toString(), true)
      if (!fee) return
      return bnOrZero(fee.average.txFee).div(bn(10).pow(ethAsset.precision)).toPrecision()
    } catch (error) {
      // TODO: handle client side errors maybe add a toast?
      moduleLogger.error(
        error,
        {
          fn: 'getWithdrawGasEstimate',
        },
        'FoxFarmingWithdraw:getWithdrawGasEstimate error',
      )
    }
  }

  const handleContinue = async () => {
    if (!opportunity) return
    // set withdraw state for future use
    dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: true })
    dispatch({
      type: FoxFarmingWithdrawActionType.SET_WITHDRAW,
      payload: { lpAmount: cryptoAmountAvailable.toString(), isExiting: true },
    })
    const lpAllowance = await allowance()
    const allowanceAmount = bnOrZero(lpAllowance).div(bn(10).pow(asset.precision))

    // Skip approval step if user allowance is greater than or equal requested deposit amount
    if (allowanceAmount.gte(cryptoAmountAvailable)) {
      const estimatedGasCrypto = await getWithdrawGasEstimate()
      if (!estimatedGasCrypto) {
        dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: false })
        return
      }
      dispatch({
        type: FoxFarmingWithdrawActionType.SET_WITHDRAW,
        payload: { estimatedGasCrypto },
      })
      onNext(DefiStep.Confirm)
      dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: false })
    } else {
      const estimatedGasCrypto = await getApproveGasData()
      if (!estimatedGasCrypto) return
      dispatch({
        type: FoxFarmingWithdrawActionType.SET_APPROVE,
        payload: {
          estimatedGasCrypto: bnOrZero(estimatedGasCrypto.average.txFee)
            .div(bn(10).pow(ethAsset.precision))
            .toPrecision(),
        },
      })
      onNext(DefiStep.Approve)
      dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: false })
    }
  }

  const validateCryptoAmount = (value: string) => {
    const crypto = bnOrZero(cryptoAmountAvailable)
    const _value = bnOrZero(value)
    const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const handleCancel = browserHistory.goBack

  return (
    <FormProvider {...methods}>
      <ReusableWithdraw
        asset={asset}
        disableInput
        icons={opportunity?.icons}
        cryptoAmountAvailable={cryptoAmountAvailable.toPrecision()}
        cryptoInputValidation={{
          required: true,
          validate: { validateCryptoAmount },
        }}
        fiatAmountAvailable={totalFiatBalance}
        marketData={{
          // The LP token doesnt have market data.
          // We're making our own market data object for the withdraw view
          price: bnOrZero(totalFiatBalance).div(cryptoAmountAvailable).toFixed(2),
          marketCap: '0',
          volume: '0',
          changePercent24Hr: 0,
        }}
        onAccountIdChange={handleAccountIdChange}
        onCancel={handleCancel}
        onContinue={handleContinue}
        isLoading={state.loading}
        percentOptions={[]}
        enableSlippage={false}
        handlePercentClick={() => {}}
        inputDefaultValue={{
          cryptoAmount: cryptoAmountAvailable.toString(),
          fiatAmount: totalFiatBalance,
        }}
        inputChildren={
          <Stack px={4} py={2}>
            <Text
              fontSize='xs'
              translation='defi.steps.withdraw.info.rewardsInfo'
              color='gray.500'
            />
            <Stack direction='row'>
              <AssetIcon assetId={foxAssetId} size='xs' />
              <Amount.Crypto value={opportunity.unclaimedRewards} symbol={foxAsset.symbol} />
            </Stack>
          </Stack>
        }
      />
    </FormProvider>
  )
}
