import type { AccountId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { BigAmount, convertPercentageToBasisPoints } from '@shapeshiftoss/utils'
import { useCallback, useContext, useMemo } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { RunePoolWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

import type { StepComponentProps } from '@/components/DeFi/components/Steps'
import type { WithdrawValues } from '@/features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from '@/features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { trackOpportunityEvent } from '@/lib/mixpanel/helpers'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { useSendThorTx } from '@/lib/utils/thorchain/hooks/useSendThorTx'
import { serializeUserStakingId, toOpportunityId } from '@/state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectHighestStakingBalanceAccountIdByStakingId,
  selectMarketDataByAssetIdUserCurrency,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type WithdrawProps = StepComponentProps & {
  accountId: AccountId | undefined
  fromAddress: string | undefined
}

const percentOptions = [0.25, 0.5, 0.75, 1]

export const Withdraw: React.FC<WithdrawProps> = ({ accountId, fromAddress, onNext }) => {
  const { state, dispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const toast = useNotificationToast({ desktopPosition: 'top-right' })
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query
  const navigate = useNavigate()

  const methods = useForm<WithdrawValues>({ mode: 'onChange' })
  const { control, setValue } = methods

  const cryptoAmount = useWatch<WithdrawValues, Field.CryptoAmount>({
    control,
    name: Field.CryptoAmount,
  })

  const assets = useAppSelector(selectAssets)
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })

  const opportunityId = useMemo(
    () => (assetId ? toOpportunityId({ chainId, assetNamespace, assetReference }) : undefined),
    [assetId, assetNamespace, assetReference, chainId],
  )

  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: opportunityId }),
    [opportunityId],
  )
  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestStakingBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )

  const opportunityDataFilter = useMemo(
    () => ({
      userStakingId: serializeUserStakingId(
        accountId ?? highestBalanceAccountId ?? '',
        opportunityId ?? '',
      ),
    }),
    [accountId, highestBalanceAccountId, opportunityId],
  )

  const opportunityData = useAppSelector(state =>
    selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter),
  )

  const asset: Asset | undefined = useAppSelector(state => selectAssetById(state, assetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)

  const amountAvailableCryptoPrecision = useMemo(() => {
    const totalBaseUnit = bnOrZero(opportunityData?.stakedAmountCryptoBaseUnit)
      .plus(bnOrZero(opportunityData?.rewardsCryptoBaseUnit?.amounts[0])) // RUNEPool rewards are denominated in RUNE
      .toFixed(0)
    return BigAmount.fromBaseUnit({
      value: totalBaseUnit,
      precision: asset.precision,
    })
  }, [
    asset.precision,
    opportunityData?.rewardsCryptoBaseUnit,
    opportunityData?.stakedAmountCryptoBaseUnit,
  ])

  const assetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId),
  )

  const fiatAmountAvailable = useMemo(
    () => amountAvailableCryptoPrecision.times(assetMarketData?.price),
    [amountAvailableCryptoPrecision, assetMarketData?.price],
  )

  const hasEnoughStakingBalance = useMemo(
    () => amountAvailableCryptoPrecision.gte(cryptoAmount),
    [amountAvailableCryptoPrecision, cryptoAmount],
  )

  const memo = useMemo(() => {
    if (!hasEnoughStakingBalance) return null

    const percent = bnOrZero(cryptoAmount)
      .div(amountAvailableCryptoPrecision.toPrecision())
      .times(100)
      .toFixed(0)
    const basisPoints = convertPercentageToBasisPoints(percent)

    return `pool-:${basisPoints}`
  }, [amountAvailableCryptoPrecision, cryptoAmount, hasEnoughStakingBalance])

  const { estimatedFeesData, isEstimatedFeesDataLoading, outboundFeeCryptoBaseUnit } =
    useSendThorTx({
      assetId,
      accountId: accountId ?? '',
      // RUNEPool withdraws are dictated by the memo, not the amount
      amountCryptoBaseUnit: null,
      memo,
      fromAddress: fromAddress ?? null,
      action: 'withdrawRunepool',
    })

  const handleContinue = useCallback(
    (formValues: WithdrawValues) => {
      if (!dispatch || !estimatedFeesData || !opportunityData) return

      dispatch({ type: RunePoolWithdrawActionType.SET_WITHDRAW, payload: formValues })
      dispatch({ type: RunePoolWithdrawActionType.SET_LOADING, payload: true })

      try {
        dispatch({
          type: RunePoolWithdrawActionType.SET_WITHDRAW,
          payload: {
            estimatedGasCryptoBaseUnit: estimatedFeesData.txFeeCryptoBaseUnit,
            networkFeeCryptoBaseUnit: estimatedFeesData.txFeeCryptoBaseUnit,
          },
        })

        onNext(DefiStep.Confirm)

        trackOpportunityEvent(
          MixPanelEvent.WithdrawContinue,
          {
            opportunity: opportunityData,
            fiatAmounts: [formValues.fiatAmount],
            cryptoAmounts: [{ assetId, amountCryptoPrecision: formValues.cryptoAmount }],
          },
          assets,
        )
      } catch (error) {
        console.error(error)
        toast({
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
      } finally {
        dispatch({ type: RunePoolWithdrawActionType.SET_LOADING, payload: false })
      }
    },
    [opportunityData, dispatch, onNext, assetId, assets, estimatedFeesData, toast, translate],
  )

  const handleCancel = useCallback(() => {
    navigate(-1)
  }, [navigate])

  const handlePercentClick = useCallback(
    (percent: number) => {
      const cryptoAmount = amountAvailableCryptoPrecision.times(percent)
      const fiatAmount = cryptoAmount.times(assetMarketData?.price)

      setValue(Field.FiatAmount, fiatAmount.toPrecision(), { shouldValidate: true })
      setValue(Field.CryptoAmount, cryptoAmount.toFixed(asset.precision), { shouldValidate: true })
    },
    [amountAvailableCryptoPrecision, asset.precision, assetMarketData?.price, setValue],
  )

  // https://gitlab.com/thorchain/thornode/-/blob/develop/x/thorchain/querier_quotes.go#L467
  const safeOutboundFeeCryptoBaseUnit = useMemo(() => {
    if (!outboundFeeCryptoBaseUnit) return
    return bnOrZero(outboundFeeCryptoBaseUnit).times(4).toFixed(0)
  }, [outboundFeeCryptoBaseUnit])

  const validateCryptoAmount = useCallback(
    (value: string) => {
      if (!opportunityData) return false
      if (!safeOutboundFeeCryptoBaseUnit) return false

      const withdrawAmountCryptoPrecision = bnOrZero(value)
      const withdrawAmountCryptoBaseUnit = BigAmount.fromPrecision({
        value,
        precision: asset.precision,
      }).toBaseUnit()

      if (amountAvailableCryptoPrecision.lt(withdrawAmountCryptoPrecision))
        return 'common.insufficientFunds'

      const isBelowWithdrawThreshold = bn(withdrawAmountCryptoBaseUnit)
        .minus(safeOutboundFeeCryptoBaseUnit)
        .lt(0)

      if (isBelowWithdrawThreshold) {
        const minLimitCryptoPrecision = BigAmount.fromBaseUnit({
          value: safeOutboundFeeCryptoBaseUnit,
          precision: asset.precision,
        }).toPrecision()
        const minLimit = `${minLimitCryptoPrecision} ${asset.symbol}`
        return translate('trade.errors.amountTooSmall', {
          minLimit,
        })
      }

      if (withdrawAmountCryptoPrecision.isEqualTo(0)) return ''

      return (
        (amountAvailableCryptoPrecision.gt(0) && withdrawAmountCryptoPrecision.gt(0)) ||
        'common.insufficientFunds'
      )
    },
    [
      amountAvailableCryptoPrecision,
      asset.precision,
      asset.symbol,
      opportunityData,
      safeOutboundFeeCryptoBaseUnit,
      translate,
    ],
  )

  const validateFiatAmount = useCallback(
    (value: string) => {
      if (!opportunityData) return false

      const amountAvailableFiat = amountAvailableCryptoPrecision.times(assetMarketData?.price)
      const valueFiat = bnOrZero(value)

      if (amountAvailableFiat.lt(valueFiat)) return 'common.insufficientFunds'
      if (valueFiat.isEqualTo(0)) return ''

      return amountAvailableFiat.gt(0) || 'common.insufficientFunds'
    },
    [amountAvailableCryptoPrecision, assetMarketData?.price, opportunityData],
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

  if (!state) return null

  return (
    <FormProvider {...methods}>
      <ReusableWithdraw
        asset={asset}
        cryptoAmountAvailable={amountAvailableCryptoPrecision.toPrecision()}
        cryptoInputValidation={cryptoInputValidation}
        fiatAmountAvailable={fiatAmountAvailable.toPrecision()}
        fiatInputValidation={fiatInputValidation}
        marketData={
          assetMarketData ?? {
            price: '0',
            marketCap: '0',
            volume: '0',
            changePercent24Hr: 0,
            supply: '0',
            maxSupply: '0',
          }
        }
        onCancel={handleCancel}
        onContinue={handleContinue}
        isLoading={isEstimatedFeesDataLoading || state.loading}
        percentOptions={percentOptions}
        enableSlippage={false}
        handlePercentClick={handlePercentClick}
      />
    </FormProvider>
  )
}
