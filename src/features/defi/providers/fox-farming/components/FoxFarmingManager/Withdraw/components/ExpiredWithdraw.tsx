import { Stack } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxFarming } from 'features/defi/providers/fox-farming/hooks/useFoxFarming'
import { useContext, useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Text } from 'components/Text'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { assertIsFoxEthStakingContractAddress } from 'state/slices/opportunitiesSlice/constants'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
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

  assertIsFoxEthStakingContractAddress(contractAddress)

  const { getUnstakeGasData, allowance, getApproveGasData } = useFoxFarming(contractAddress)
  const { setFarmingAccountId: handleFarmingAccountIdChange } = useFoxEth()

  const methods = useForm<WithdrawValues>({ mode: 'onChange' })

  const asset = useAppSelector(state =>
    selectAssetById(state, opportunity?.underlyingAssetId ?? ''),
  )
  const foxAsset = useAppSelector(state => selectAssetById(state, foxAssetId))

  const lpMarketData = useAppSelector(state =>
    selectMarketDataById(state, opportunity?.underlyingAssetId ?? ''),
  )

  // user info
  const amountAvailableCryptoPrecision = useMemo(
    () => bnOrZero(opportunity?.cryptoAmountBaseUnit).div(bn(10).pow(asset?.precision)),
    [asset?.precision, opportunity?.cryptoAmountBaseUnit],
  )
  const totalFiatBalance = opportunity?.fiatAmount

  if (!state || !dispatch || !opportunity || !totalFiatBalance) return null

  const getWithdrawGasEstimate = async () => {
    if (!opportunity?.cryptoAmountBaseUnit) return

    try {
      const fee = await getUnstakeGasData(opportunity.cryptoAmountBaseUnit, true)
      if (!fee) return
      return fee.average.txFee
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
    if (!opportunity?.cryptoAmountBaseUnit) return
    // set withdraw state for future use
    dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: true })
    dispatch({
      type: FoxFarmingWithdrawActionType.SET_WITHDRAW,
      payload: {
        lpAmountCryptoBaseUnit: opportunity.cryptoAmountBaseUnit,
        isExiting: true,
      },
    })
    const lpAllowanceAmountCryptoBaseUnit = await allowance()

    // Skip approval step if user allowance is greater than or equal requested deposit amount
    if (bnOrZero(lpAllowanceAmountCryptoBaseUnit).gte(opportunity?.cryptoAmountBaseUnit)) {
      const estimatedGasCryptoBaseUnit = await getWithdrawGasEstimate()
      if (!estimatedGasCryptoBaseUnit) {
        dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: false })
        return
      }
      dispatch({
        type: FoxFarmingWithdrawActionType.SET_WITHDRAW,
        payload: { estimatedGasCryptoBaseUnit },
      })
      onNext(DefiStep.Confirm)
      dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: false })
    } else {
      const estimatedGasCryptoBaseUnit = await getApproveGasData()
      if (!estimatedGasCryptoBaseUnit) return
      dispatch({
        type: FoxFarmingWithdrawActionType.SET_APPROVE,
        payload: {
          estimatedGasCryptoBaseUnit: estimatedGasCryptoBaseUnit.average.txFee,
        },
      })
      onNext(DefiStep.Approve)
      dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: false })
    }
  }

  const validateCryptoAmount = (value: string) => {
    const crypto = amountAvailableCryptoPrecision
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
        cryptoAmountAvailableBaseUnit={opportunity?.cryptoAmountBaseUnit ?? '0'}
        cryptoInputValidation={{
          required: true,
          validate: { validateCryptoAmount },
        }}
        fiatAmountAvailable={totalFiatBalance}
        marketData={lpMarketData}
        onAccountIdChange={handleFarmingAccountIdChange}
        onCancel={handleCancel}
        onContinue={handleContinue}
        isLoading={state.loading}
        percentOptions={[]}
        enableSlippage={false}
        handlePercentClick={() => {}}
        inputDefaultValue={{
          cryptoAmount: amountAvailableCryptoPrecision.toFixed(),
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
              <Amount.FromBaseUnit
                assetId={opportunity?.underlyingAssetId ?? ''}
                value={opportunity?.rewardsAmountsCryptoBaseUnit?.[0] ?? '0'}
                symbol={foxAsset.symbol}
              />
            </Stack>
          </Stack>
        }
      />
    </FormProvider>
  )
}
