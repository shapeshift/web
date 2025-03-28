import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, ethAssetId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { useCallback, useContext, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { getAddress } from 'viem'

import { UniV2DepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

import type { AccountDropdownProps } from '@/components/AccountDropdown/AccountDropdown'
import type { StepComponentProps } from '@/components/DeFi/components/Steps'
import type { DepositValues } from '@/features/defi/components/Deposit/PairDeposit'
import { PairDeposit } from '@/features/defi/components/Deposit/PairDeposit'
import type {
  DefiParams,
  DefiQueryParams,
} from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useUniV2LiquidityPool } from '@/features/defi/providers/univ2/hooks/useUniV2LiquidityPool'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { trackOpportunityEvent } from '@/lib/mixpanel/helpers'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import type { LpId } from '@/state/slices/opportunitiesSlice/types'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserLpOpportunity,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'
type DepositProps = StepComponentProps & {
  accountId: AccountId | undefined
  onAccountIdChange?: AccountDropdownProps['onChange']
}

const percentOptions = [0.25, 0.5, 0.75, 1]

export const Deposit: React.FC<DepositProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
  onNext,
}) => {
  const { state, dispatch } = useContext(DepositContext)
  const translate = useTranslate()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query

  const lpAssetId = toAssetId({ chainId, assetNamespace, assetReference })

  const lpOpportunityFilter = useMemo(
    () => ({
      lpId: lpAssetId as LpId,
      assetId: lpAssetId,
      accountId,
    }),
    [accountId, lpAssetId],
  )
  const lpOpportunity = useAppSelector(state =>
    selectEarnUserLpOpportunity(state, lpOpportunityFilter),
  )

  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Ethereum,
  })
  const assetId0 = lpOpportunity?.underlyingAssetIds[0] ?? ''
  const assetId1 = lpOpportunity?.underlyingAssetIds[1] ?? ''
  const { asset0Allowance, asset1Allowance, getApproveFees, getDepositFees } =
    useUniV2LiquidityPool({
      accountId: accountId ?? '',
      lpAssetId,
      assetId0,
      assetId1,
    })

  const lpAsset = useAppSelector(state => selectAssetById(state, lpAssetId))
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const asset0 = useAppSelector(state => selectAssetById(state, assetId0))
  const asset1 = useAppSelector(state => selectAssetById(state, assetId1))
  const asset1MarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId1),
  )
  const asset0MarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId0),
  )
  const assets = useAppSelector(selectAssets)

  if (!lpAsset) throw new Error(`Asset not found for AssetId ${lpAssetId}`)
  if (!asset1) throw new Error(`Asset not found for AssetId ${assetId1}`)
  if (!asset0) throw new Error(`Asset not found for AssetId ${assetId0}`)

  // user info
  const asset1Balance = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, {
      assetId: assetId1,
      accountId: accountId ?? '',
    }),
  )
  const asset0Balance = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, {
      assetId: assetId0,
      accountId: accountId ?? '',
    }),
  )

  // notify
  const toast = useToast()

  const getDepositGasEstimateCryptoPrecision = useCallback(
    async (deposit: DepositValues): Promise<string | undefined> => {
      if (!(feeAsset && dispatch)) return
      const { cryptoAmount0: token0Amount, cryptoAmount1: token1Amount } = deposit
      try {
        const fees = await getDepositFees({
          token0Amount,
          token1Amount,
        })
        if (!fees) return
        return fromBaseUnit(fees.networkFeeCryptoBaseUnit, feeAsset.precision)
      } catch (error) {
        console.error(error)
        toast({
          position: 'top-right',
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
        dispatch({ type: UniV2DepositActionType.SET_LOADING, payload: false })
      }
    },
    [dispatch, feeAsset, getDepositFees, toast, translate],
  )

  const handleContinue = useCallback(
    async (formValues: DepositValues) => {
      if (!lpOpportunity || !feeAsset || !dispatch) return
      // set deposit state for future use
      dispatch({
        type: UniV2DepositActionType.SET_DEPOSIT,
        payload: {
          asset0CryptoAmount: formValues.cryptoAmount0,
          asset0FiatAmount: formValues.fiatAmount0,
          asset1CryptoAmount: formValues.cryptoAmount1,
          asset1FiatAmount: formValues.fiatAmount1,
        },
      })
      trackOpportunityEvent(
        MixPanelEvent.DepositContinue,
        {
          opportunity: lpOpportunity,
          fiatAmounts: [formValues.fiatAmount0, formValues.fiatAmount1],
          cryptoAmounts: [
            { assetId: assetId0, amountCryptoHuman: formValues.cryptoAmount0 },
            { assetId: assetId1, amountCryptoHuman: formValues.cryptoAmount1 },
          ],
        },
        assets,
      )
      dispatch({ type: UniV2DepositActionType.SET_LOADING, payload: true })
      try {
        // Check if approval is required for user address on any of the two assets
        const asset0AllowanceCryptoBaseUnit = bnOrZero(await asset0Allowance())
        const asset0AllowanceAmount = fromBaseUnit(asset0AllowanceCryptoBaseUnit, asset0.precision)
        const asset1AllowanceCryptoBaseUnit = bnOrZero(await asset1Allowance())
        const asset1AllowanceAmount = fromBaseUnit(asset1AllowanceCryptoBaseUnit, asset1.precision)

        const isAsset0AllowanceGranted =
          assetId0 === ethAssetId ||
          bn(asset0AllowanceAmount).gte(bnOrZero(formValues.cryptoAmount0))
        const isAsset1AllowanceGranted =
          assetId1 === ethAssetId ||
          bn(asset1AllowanceAmount).gte(bnOrZero(formValues.cryptoAmount1))

        // Skip approval step if user allowance is greater than or equal requested deposit amount for both assets
        if (isAsset0AllowanceGranted && isAsset1AllowanceGranted) {
          const estimatedGasCryptoPrecision = await getDepositGasEstimateCryptoPrecision(formValues)
          if (!estimatedGasCryptoPrecision) return
          dispatch({
            type: UniV2DepositActionType.SET_DEPOSIT,
            payload: { estimatedGasCryptoPrecision },
          })
          onNext(DefiStep.Confirm)
          dispatch({ type: UniV2DepositActionType.SET_LOADING, payload: false })
        } else {
          const asset0ContractAddress =
            assetId0 !== ethAssetId ? getAddress(fromAssetId(assetId0).assetReference) : undefined
          const asset1ContractAddress =
            assetId1 !== ethAssetId ? getAddress(fromAssetId(assetId1).assetReference) : undefined

          // While the naive approach would be to think both assets approve() calls are going to result in the same gas estimation,
          // this is not necesssarly true. Some ERC-20s approve() might have a bit more logic, and thus require more gas.
          // e.g https://github.com/Uniswap/governance/blob/eabd8c71ad01f61fb54ed6945162021ee419998e/contracts/Uni.sol#L119
          const asset0ApprovalFee =
            asset0ContractAddress &&
            bnOrZero((await getApproveFees(asset0ContractAddress))?.networkFeeCryptoBaseUnit)
          const asset1ApprovalFee =
            asset1ContractAddress &&
            bnOrZero((await getApproveFees(asset1ContractAddress))?.networkFeeCryptoBaseUnit)

          if (!(asset0ApprovalFee || asset1ApprovalFee)) return

          if (!isAsset0AllowanceGranted && asset0ApprovalFee) {
            dispatch({
              type: UniV2DepositActionType.SET_APPROVE_0,
              payload: {
                estimatedGasCryptoPrecision: fromBaseUnit(asset0ApprovalFee, feeAsset.precision),
              },
            })
          }

          if (!isAsset1AllowanceGranted && asset1ApprovalFee) {
            dispatch({
              type: UniV2DepositActionType.SET_APPROVE_1,
              payload: {
                estimatedGasCryptoPrecision: fromBaseUnit(asset1ApprovalFee, feeAsset.precision),
              },
            })
          }

          onNext(DefiStep.Approve)
          dispatch({ type: UniV2DepositActionType.SET_LOADING, payload: false })
        }
      } catch (error) {
        console.error(error)
        toast({
          position: 'top-right',
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
        dispatch({ type: UniV2DepositActionType.SET_LOADING, payload: false })
      }
    },
    [
      asset0.precision,
      asset0Allowance,
      asset1.precision,
      asset1Allowance,
      assetId0,
      assetId1,
      assets,
      dispatch,
      feeAsset,
      getApproveFees,
      getDepositGasEstimateCryptoPrecision,
      lpOpportunity,
      onNext,
      toast,
      translate,
    ],
  )

  const handleCancel = useCallback(() => {
    browserHistory.goBack()
  }, [browserHistory])

  const validateCryptoAmount = useCallback(
    (value: string, isForAsset0: boolean) => {
      const crypto = fromBaseUnit(
        isForAsset0 ? asset0Balance : asset1Balance,
        (isForAsset0 ? asset0 : asset1).precision,
      )
      const _value = bnOrZero(value)
      const hasValidBalance = bn(crypto).gt(0) && _value.gt(0) && bn(crypto).gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [asset0, asset0Balance, asset1, asset1Balance],
  )

  const validateFiatAmount = useCallback(
    (value: string, isForAsset0: boolean) => {
      const crypto = fromBaseUnit(
        isForAsset0 ? asset0Balance : asset1Balance,
        (isForAsset0 ? asset0 : asset1).precision,
      )
      const fiat = bn(crypto).times((isForAsset0 ? asset0MarketData : asset1MarketData).price)
      const _value = bnOrZero(value)
      const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [asset0, asset0Balance, asset0MarketData, asset1, asset1Balance, asset1MarketData],
  )

  const asset0CryptoAmountAvailable = fromBaseUnit(asset0Balance, asset0.precision)
  const asset0FiatAmountAvailable = useMemo(
    () => bn(asset0CryptoAmountAvailable).times(asset0MarketData.price),
    [asset0CryptoAmountAvailable, asset0MarketData.price],
  )

  const asset1CryptoAmountAvailable = useMemo(
    () => fromBaseUnit(asset1Balance, asset1.precision),
    [asset1.precision, asset1Balance],
  )
  const asset1FiatAmountAvailable = useMemo(
    () => bn(asset1CryptoAmountAvailable).times(asset1MarketData.price),
    [asset1CryptoAmountAvailable, asset1MarketData.price],
  )

  const cryptoInputValidation0 = useMemo(
    () => ({
      required: true,
      validate: { validateCryptoAmount0: (val: string) => validateCryptoAmount(val, true) },
    }),
    [validateCryptoAmount],
  )
  const cryptoInputValidation1 = useMemo(
    () => ({
      required: true,
      validate: { validateCryptoAmount1: (val: string) => validateCryptoAmount(val, false) },
    }),
    [validateCryptoAmount],
  )

  const fiatInputValidation0 = useMemo(
    () => ({
      required: true,
      validate: { validateFiatAmount0: (val: string) => validateFiatAmount(val, true) },
    }),
    [validateFiatAmount],
  )

  const fiatInputValidation1 = useMemo(
    () => ({
      required: true,
      validate: { validateFiatAmount1: (val: string) => validateFiatAmount(val, false) },
    }),
    [validateFiatAmount],
  )

  if (!state || !dispatch) return null
  if (!accountId || !lpOpportunity) return null
  return (
    <PairDeposit
      accountId={accountId}
      asset0={asset0}
      asset1={asset1}
      icons={lpOpportunity?.icons}
      underlyingAssetRatiosBaseUnit={lpOpportunity.underlyingAssetRatiosBaseUnit}
      destAsset={lpAsset}
      apy={lpOpportunity?.apy?.toString() ?? ''}
      cryptoAmountAvailable0={asset0CryptoAmountAvailable}
      cryptoAmountAvailable1={asset1CryptoAmountAvailable}
      cryptoInputValidation0={cryptoInputValidation0}
      cryptoInputValidation1={cryptoInputValidation1}
      fiatAmountAvailable0={asset0FiatAmountAvailable.toFixed(2)}
      fiatAmountAvailable1={asset1FiatAmountAvailable.toFixed(2)}
      fiatInputValidation0={fiatInputValidation0}
      fiatInputValidation1={fiatInputValidation1}
      marketData0={asset0MarketData}
      marketData1={asset1MarketData}
      onCancel={handleCancel}
      onAccountIdChange={handleAccountIdChange}
      onContinue={handleContinue}
      percentOptions={percentOptions}
      enableSlippage={false}
      isLoading={state.loading}
    />
  )
}
