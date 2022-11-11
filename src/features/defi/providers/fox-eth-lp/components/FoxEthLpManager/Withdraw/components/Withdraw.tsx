import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId, fromAccountId } from '@shapeshiftoss/caip'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxEthLiquidityPool } from 'features/defi/providers/fox-eth-lp/hooks/useFoxEthLiquidityPool'
import { useContext, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { AssetInput } from 'components/DeFi/components/AssetInput'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnUserLpOpportunity,
  selectAssetById,
  selectMarketData,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxEthLpWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

const moduleLogger = logger.child({ namespace: ['Withdraw'] })

type WithdrawProps = StepComponentProps & {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const Withdraw: React.FC<WithdrawProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
  onNext,
}) => {
  const assets = useAppSelector(selectorState => selectorState.assets.byId)
  const marketData = useAppSelector(selectMarketData)
  const { state, dispatch } = useContext(WithdrawContext)
  const { history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()

  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : null),
    [accountId],
  )

  const foxEthLpOpportunity = useAppSelector(state =>
    selectAggregatedEarnUserLpOpportunity(state, {
      lpId: foxEthLpAssetId as LpId,
      assetId: foxEthLpAssetId ?? '',
    }),
  )

  const underlyingAssetsIcons = useMemo(
    () => foxEthLpOpportunity?.underlyingAssetIds.map(assetId => assets[assetId].icon),
    [assets, foxEthLpOpportunity?.underlyingAssetIds],
  )

  const { allowance, getApproveGasData, getWithdrawGasData } =
    useFoxEthLiquidityPool(accountAddress)
  const [foxAmount, setFoxAmount] = useState('0')
  const [ethAmount, setEthAmount] = useState('0')

  const methods = useForm<WithdrawValues>({ mode: 'onChange' })
  const { setValue } = methods

  const asset = useAppSelector(state => selectAssetById(state, foxEthLpAssetId ?? ''))
  const assetMarketData = useAppSelector(state => selectMarketDataById(state, asset.assetId))
  const foxAsset = useAppSelector(state => selectAssetById(state, foxAssetId))
  const foxMarketData = useAppSelector(state => selectMarketDataById(state, foxAssetId))
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const ethMarketData = useAppSelector(state => selectMarketDataById(state, ethAssetId))

  const fiatAmountAvailable = bnOrZero(foxEthLpOpportunity?.cryptoAmount)
    .times(marketData?.[foxEthLpAssetId]?.price ?? '0')
    .toString()

  // user info
  const filter = useMemo(
    () => ({ assetId: foxEthLpOpportunity?.assetId ?? '', accountId: accountId ?? '' }),
    [foxEthLpOpportunity?.assetId, accountId],
  )
  const balance = useAppSelector(state => selectPortfolioCryptoBalanceByFilter(state, filter))

  const cryptoAmountAvailable = bnOrZero(balance).div(bn(10).pow(asset?.precision))

  if (!state || !dispatch) return null

  const getWithdrawGasEstimate = async (withdraw: WithdrawValues) => {
    try {
      const fee = await getWithdrawGasData(withdraw.cryptoAmount, foxAmount, ethAmount)
      if (!fee) return
      return bnOrZero(fee.average.txFee).div(bn(10).pow(ethAsset.precision)).toPrecision()
    } catch (error) {
      // TODO: handle client side errors maybe add a toast?
      moduleLogger.error(error, 'FoxEthLpWithdraw:getWithdrawGasEstimate error:')
    }
  }

  const handleContinue = async (formValues: WithdrawValues) => {
    if (!foxEthLpOpportunity) return
    // set withdraw state for future use
    dispatch({ type: FoxEthLpWithdrawActionType.SET_LOADING, payload: true })
    dispatch({
      type: FoxEthLpWithdrawActionType.SET_WITHDRAW,
      payload: { lpAmount: formValues.cryptoAmount, foxAmount, ethAmount },
    })
    const lpAllowance = await allowance(true)
    const allowanceAmount = bnOrZero(lpAllowance).div(`1e+${asset.precision}`)

    // Skip approval step if user allowance is greater than or equal requested deposit amount
    if (allowanceAmount.gte(bnOrZero(formValues.cryptoAmount))) {
      const estimatedGasCrypto = await getWithdrawGasEstimate(formValues)
      if (!estimatedGasCrypto) {
        dispatch({ type: FoxEthLpWithdrawActionType.SET_LOADING, payload: false })
        return
      }
      dispatch({
        type: FoxEthLpWithdrawActionType.SET_WITHDRAW,
        payload: { estimatedGasCrypto },
      })
      onNext(DefiStep.Confirm)
      dispatch({ type: FoxEthLpWithdrawActionType.SET_LOADING, payload: false })
    } else {
      const estimatedGasCrypto = await getApproveGasData(true)
      if (!estimatedGasCrypto) return
      dispatch({
        type: FoxEthLpWithdrawActionType.SET_APPROVE,
        payload: {
          estimatedGasCrypto: bnOrZero(estimatedGasCrypto.average.txFee)
            .div(bn(10).pow(ethAsset.precision))
            .toPrecision(),
        },
      })
      onNext(DefiStep.Approve)
      dispatch({ type: FoxEthLpWithdrawActionType.SET_LOADING, payload: false })
    }
  }

  const handleCancel = () => {
    browserHistory.goBack()
  }

  const handlePercentClick = (percent: number) => {
    const cryptoAmount = bnOrZero(cryptoAmountAvailable).times(percent)
    const fiatAmount = bnOrZero(fiatAmountAvailable).times(percent).toString()
    setValue(Field.FiatAmount, fiatAmount.toString(), { shouldValidate: true })
    setValue(Field.CryptoAmount, cryptoAmount.toString(), { shouldValidate: true })
    if (foxEthLpOpportunity.underlyingToken1Amount && foxEthLpOpportunity.underlyingToken0Amount) {
      setFoxAmount(bnOrZero(percent).times(foxEthLpOpportunity.underlyingToken1Amount).toFixed(8))
      setEthAmount(bnOrZero(percent).times(foxEthLpOpportunity.underlyingToken0Amount).toFixed(8))
    }
  }

  const handleInputChange = (value: string, isFiat?: boolean) => {
    const percentage = bnOrZero(value).div(
      bnOrZero(isFiat ? fiatAmountAvailable : cryptoAmountAvailable),
    )
    if (foxEthLpOpportunity.underlyingToken1Amount && foxEthLpOpportunity.underlyingToken0Amount) {
      setFoxAmount(percentage.times(foxEthLpOpportunity.underlyingToken1Amount).toFixed(8))
      setEthAmount(percentage.times(foxEthLpOpportunity.underlyingToken0Amount).toFixed(8))
    }
  }

  const validateCryptoAmount = (value: string) => {
    const crypto = bnOrZero(balance).div(`1e+${asset.precision}`)
    const _value = bnOrZero(value)
    const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const validateFiatAmount = (value: string) => {
    const _value = bnOrZero(value)
    const fiat = bnOrZero(fiatAmountAvailable)
    const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  return (
    <FormProvider {...methods}>
      <ReusableWithdraw
        accountId={accountId}
        asset={asset}
        icons={underlyingAssetsIcons}
        cryptoAmountAvailable={cryptoAmountAvailable.toPrecision()}
        cryptoInputValidation={{
          required: true,
          validate: { validateCryptoAmount },
        }}
        fiatAmountAvailable={fiatAmountAvailable}
        fiatInputValidation={{
          required: true,
          validate: { validateFiatAmount },
        }}
        marketData={assetMarketData}
        onAccountIdChange={handleAccountIdChange}
        onCancel={handleCancel}
        onContinue={handleContinue}
        isLoading={state.loading || !foxEthLpOpportunity}
        percentOptions={[0.25, 0.5, 0.75, 1]}
        enableSlippage={false}
        handlePercentClick={handlePercentClick}
        onInputChange={handleInputChange}
      >
        <>
          <Text translation='common.receive' />
          <AssetInput
            {...(accountId ? { accountId } : {})}
            cryptoAmount={foxAmount}
            fiatAmount={bnOrZero(foxAmount).times(foxMarketData.price).toFixed(2)}
            showFiatAmount={true}
            assetIcon={foxAsset.icon}
            assetSymbol={foxAsset.symbol}
            balance={foxEthLpOpportunity.underlyingToken1Amount ?? undefined}
            fiatBalance={bnOrZero(foxEthLpOpportunity.underlyingToken1Amount)
              .times(foxMarketData.price)
              .toFixed(2)}
            percentOptions={[]}
            isReadOnly={true}
          />
          <AssetInput
            {...(accountId ? { accountId } : {})}
            cryptoAmount={ethAmount}
            fiatAmount={bnOrZero(ethAmount).times(ethMarketData.price).toFixed(2)}
            showFiatAmount={true}
            assetIcon={ethAsset.icon}
            assetSymbol={ethAsset.symbol}
            balance={foxEthLpOpportunity.underlyingToken0Amount ?? undefined}
            fiatBalance={bnOrZero(foxEthLpOpportunity.underlyingToken0Amount)
              .times(ethMarketData.price)
              .toFixed(2)}
            percentOptions={[]}
            isReadOnly={true}
          />
        </>
      </ReusableWithdraw>
    </FormProvider>
  )
}
