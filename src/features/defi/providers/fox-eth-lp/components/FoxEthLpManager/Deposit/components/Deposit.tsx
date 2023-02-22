import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { DepositValues } from 'features/defi/components/Deposit/PairDeposit'
import { PairDeposit } from 'features/defi/components/Deposit/PairDeposit'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxEthLiquidityPool } from 'features/defi/providers/fox-eth-lp/hooks/useFoxEthLiquidityPool'
import qs from 'qs'
import { useContext } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxEthLpDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

const moduleLogger = logger.child({ namespace: ['FoxEthLpDeposit:Deposit'] })

type DepositProps = StepComponentProps & {
  accountId: AccountId | undefined
  onAccountIdChange?: AccountDropdownProps['onChange']
}

export const Deposit: React.FC<DepositProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
  onNext,
}) => {
  const { state, dispatch } = useContext(DepositContext)
  const history = useHistory()
  const translate = useTranslate()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetReference } = query
  const opportunity = state?.opportunity
  const { lpAccountId } = useFoxEth()
  const { allowance, getApproveGasData, getDepositGasData } = useFoxEthLiquidityPool(lpAccountId)

  const assetNamespace = 'erc20'
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const foxAsset = useAppSelector(state => selectAssetById(state, foxAssetId))
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const foxMarketData = useAppSelector(state => selectMarketDataById(state, foxAssetId))
  const ethMarketData = useAppSelector(state => selectMarketDataById(state, ethAssetId))

  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  if (!foxAsset) throw new Error(`Asset not found for AssetId ${foxAssetId}`)
  if (!ethAsset) throw new Error(`Asset not found for AssetId ${ethAssetId}`)

  // user info
  const foxBalance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, {
      assetId: foxAssetId,
      accountId: accountId ?? '',
    }),
  )
  const ethBalance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, {
      assetId: ethAssetId,
      accountId: accountId ?? '',
    }),
  )

  // notify
  const toast = useToast()

  if (!state || !dispatch) return null

  const getDepositGasEstimate = async (deposit: DepositValues): Promise<string | undefined> => {
    try {
      const gasData = await getDepositGasData(deposit.cryptoAmount0, deposit.cryptoAmount1)
      if (!gasData) return
      return bnOrZero(gasData.average.txFee).div(bn(10).pow(ethAsset.precision)).toPrecision()
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
      dispatch({ type: FoxEthLpDepositActionType.SET_LOADING, payload: false })
    }
  }

  const handleContinue = async (formValues: DepositValues) => {
    // set deposit state for future use
    dispatch({
      type: FoxEthLpDepositActionType.SET_DEPOSIT,
      payload: {
        ethCryptoAmount: formValues.cryptoAmount0,
        ethFiatAmount: formValues.fiatAmount0,
        foxCryptoAmount: formValues.cryptoAmount1,
        foxFiatAmount: formValues.fiatAmount1,
      },
    })
    dispatch({ type: FoxEthLpDepositActionType.SET_LOADING, payload: true })
    try {
      // Check if approval is required for user address
      const lpAllowance = await allowance()
      const allowanceAmount = bnOrZero(lpAllowance).div(bn(10).pow(foxAsset.precision))

      // Skip approval step if user allowance is greater than or equal requested deposit amount
      if (allowanceAmount.gte(bnOrZero(formValues.cryptoAmount1))) {
        const estimatedGasCrypto = await getDepositGasEstimate(formValues)
        if (!estimatedGasCrypto) return
        dispatch({
          type: FoxEthLpDepositActionType.SET_DEPOSIT,
          payload: { estimatedGasCrypto },
        })
        onNext(DefiStep.Confirm)
        dispatch({ type: FoxEthLpDepositActionType.SET_LOADING, payload: false })
      } else {
        const estimatedGasCrypto = await getApproveGasData()
        if (!estimatedGasCrypto) return
        dispatch({
          type: FoxEthLpDepositActionType.SET_APPROVE,
          payload: {
            estimatedGasCrypto: bnOrZero(estimatedGasCrypto.average.txFee)
              .div(bn(10).pow(ethAsset.precision))
              .toPrecision(),
          },
        })
        onNext(DefiStep.Approve)
        dispatch({ type: FoxEthLpDepositActionType.SET_LOADING, payload: false })
      }
    } catch (error) {
      moduleLogger.error({ fn: 'handleContinue', error }, 'Error on continue')
      toast({
        position: 'top-right',
        description: translate('common.somethingWentWrongBody'),
        title: translate('common.somethingWentWrong'),
        status: 'error',
      })
      dispatch({ type: FoxEthLpDepositActionType.SET_LOADING, payload: false })
    }
  }

  const handleCancel = () => {
    browserHistory.goBack()
  }

  const validateCryptoAmount = (value: string, isForAsset0: boolean) => {
    const crypto = bnOrZero(isForAsset0 ? ethBalance : foxBalance).div(
      `1e+${(isForAsset0 ? foxAsset : ethAsset).precision}`,
    )
    const _value = bnOrZero(value)
    const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const validateFiatAmount = (value: string, isForAsset0: boolean) => {
    const crypto = bnOrZero(isForAsset0 ? ethBalance : foxBalance).div(
      `1e+${(isForAsset0 ? foxAsset : ethAsset).precision}`,
    )
    const fiat = crypto.times((isForAsset0 ? ethMarketData : foxMarketData).price)
    const _value = bnOrZero(value)
    const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const foxCryptoAmountAvailable = bnOrZero(foxBalance).div(bn(10).pow(foxAsset.precision))
  const foxFiatAmountAvailable = bnOrZero(foxCryptoAmountAvailable).times(foxMarketData.price)
  const ethCryptoAmountAvailable = bnOrZero(ethBalance).div(bn(10).pow(ethAsset.precision))
  const ethFiatAmountAvailable = bnOrZero(ethCryptoAmountAvailable).times(ethMarketData.price)

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
    <PairDeposit
      accountId={accountId}
      asset0={ethAsset}
      asset1={foxAsset}
      icons={opportunity?.icons}
      destAsset={asset}
      apy={opportunity?.apy?.toString() ?? ''}
      cryptoAmountAvailable0={ethCryptoAmountAvailable.toPrecision()}
      cryptoAmountAvailable1={foxCryptoAmountAvailable.toPrecision()}
      cryptoInputValidation0={{
        required: true,
        validate: { validateCryptoAmount0: (val: string) => validateCryptoAmount(val, true) },
      }}
      cryptoInputValidation1={{
        required: true,
        validate: { validateCryptoAmount1: (val: string) => validateCryptoAmount(val, false) },
      }}
      fiatAmountAvailable0={ethFiatAmountAvailable.toFixed(2)}
      fiatAmountAvailable1={foxFiatAmountAvailable.toFixed(2)}
      fiatInputValidation0={{
        required: true,
        validate: { validateFiatAmount0: (val: string) => validateFiatAmount(val, true) },
      }}
      fiatInputValidation1={{
        required: true,
        validate: { validateFiatAmount1: (val: string) => validateFiatAmount(val, false) },
      }}
      marketData0={ethMarketData}
      marketData1={foxMarketData}
      onCancel={handleCancel}
      onAccountIdChange={handleAccountIdChange}
      onContinue={handleContinue}
      onBack={handleBack}
      percentOptions={[0.25, 0.5, 0.75, 1]}
      enableSlippage={false}
      isLoading={state.loading}
    />
  )
}
