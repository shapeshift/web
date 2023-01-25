import { useToast } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import type { UtxoBaseAdapter, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import { getInboundAddressDataForChain } from '@shapeshiftoss/swapper'
import { getConfig } from 'config'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { toBaseUnit } from 'lib/math'
import {
  fromThorBaseUnit,
  getThorchainSaversWithdrawQuote,
  getWithdrawBps,
} from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectHighestBalanceAccountIdByStakingId,
  selectMarketDataById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ThorchainSaversWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'ThorchainSavers', 'ThorchainSaversWithdraw'],
})

type WithdrawProps = StepComponentProps & { accountId: AccountId | undefined }

export const Withdraw: React.FC<WithdrawProps> = ({ accountId, onNext }) => {
  const [outboundFeeCryptoBaseUnit, setOutboundFeeCryptoBaseUnit] = useState('')
  const { state, dispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const toast = useToast()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query

  const methods = useForm<WithdrawValues>({ mode: 'onChange' })
  const { setValue } = methods

  // Asset info

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const opportunityId = useMemo(
    () => (assetId ? toOpportunityId({ chainId, assetNamespace, assetReference }) : undefined),
    [assetId, assetNamespace, assetReference, chainId],
  )

  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: opportunityId }),
    [opportunityId],
  )
  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
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

  const userAddress = useMemo(() => accountId && fromAccountId(accountId).account, [accountId])

  // user info
  const amountAvailableCryptoPrecision = useMemo(() => {
    return bnOrZero(opportunityData?.stakedAmountCryptoBaseUnit).div(bn(10).pow(asset.precision))
  }, [asset.precision, opportunityData?.stakedAmountCryptoBaseUnit])

  const assetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const fiatAmountAvailable = useMemo(
    () => bnOrZero(amountAvailableCryptoPrecision).times(assetMarketData.price),
    [amountAvailableCryptoPrecision, assetMarketData.price],
  )

  const getOutboundFeeCryptoBaseUnit = useCallback(async () => {
    if (!(accountId && opportunityData?.stakedAmountCryptoBaseUnit)) return

    const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
    const inboundAddressData = await getInboundAddressDataForChain(daemonUrl, assetId)

    if (!inboundAddressData) return

    const { outbound_fee } = inboundAddressData

    const outboundFeeCryptoBaseUnit = toBaseUnit(fromThorBaseUnit(outbound_fee), asset.precision)

    return outboundFeeCryptoBaseUnit
  }, [accountId, asset.precision, assetId, opportunityData?.stakedAmountCryptoBaseUnit])

  const getWithdrawGasEstimate = useCallback(
    async (withdraw: WithdrawValues) => {
      if (
        !(userAddress && assetReference && accountId && opportunityData?.stakedAmountCryptoBaseUnit)
      )
        return
      try {
        const amountCryptoBaseUnit = bnOrZero(withdraw.cryptoAmount).times(
          bn(10).pow(asset.precision),
        )
        const withdrawBps = getWithdrawBps({
          withdrawAmountCryptoBaseUnit: amountCryptoBaseUnit,
          stakedAmountCryptoBaseUnit: opportunityData?.stakedAmountCryptoBaseUnit,
          rewardsamountCryptoBaseUnit: opportunityData?.rewardsAmountsCryptoBaseUnit?.[0] ?? '0',
        })

        const quote = await getThorchainSaversWithdrawQuote({ asset, accountId, bps: withdrawBps })
        const chainAdapters = getChainAdapterManager()
        // We're lying to Ts, this isn't always an UtxoBaseAdapter
        // But typing this as any chain-adapter won't narrow down its type and we'll have errors at `chainSpecific` property
        const adapter = chainAdapters.get(chainId) as unknown as UtxoBaseAdapter<UtxoChainId>
        const fastFeeCryptoBaseUnit = (
          await adapter.getFeeData({
            to: quote.inbound_address,
            value: amountCryptoBaseUnit.toFixed(0),
            chainSpecific: { pubkey: userAddress, from: '' },
            sendMax: false,
          })
        ).fast.txFee

        const fastFeeCryptoPrecision = bnOrZero(
          bn(fastFeeCryptoBaseUnit).div(bn(10).pow(asset.precision)),
        )
        return bnOrZero(fastFeeCryptoPrecision).toString()
      } catch (error) {
        moduleLogger.error(
          { fn: 'getWithdrawGasEstimate', error },
          'Error getting deposit gas estimate',
        )
        toast({
          position: 'top-right',
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
      }
    },
    [userAddress, assetReference, accountId, opportunityData, asset, chainId, toast, translate],
  )

  useEffect(() => {
    ;(async () => {
      if (outboundFeeCryptoBaseUnit) return

      setOutboundFeeCryptoBaseUnit((await getOutboundFeeCryptoBaseUnit()) ?? '')
    })()
  }, [getOutboundFeeCryptoBaseUnit, outboundFeeCryptoBaseUnit])

  const handleContinue = useCallback(
    async (formValues: WithdrawValues) => {
      if (!(userAddress && opportunityData && dispatch)) return
      // set withdraw state for future use
      dispatch({ type: ThorchainSaversWithdrawActionType.SET_WITHDRAW, payload: formValues })
      dispatch({ type: ThorchainSaversWithdrawActionType.SET_LOADING, payload: true })
      try {
        const estimatedGasCrypto = await getWithdrawGasEstimate(formValues)
        if (!estimatedGasCrypto) return
        dispatch({
          type: ThorchainSaversWithdrawActionType.SET_WITHDRAW,
          payload: { estimatedGasCrypto },
        })
        onNext(DefiStep.Confirm)
        dispatch({ type: ThorchainSaversWithdrawActionType.SET_LOADING, payload: false })
      } catch (error) {
        moduleLogger.error({ fn: 'handleContinue', error }, 'Error on continue')
        toast({
          position: 'top-right',
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
        dispatch({ type: ThorchainSaversWithdrawActionType.SET_LOADING, payload: false })
      }
    },
    [userAddress, opportunityData, dispatch, getWithdrawGasEstimate, onNext, toast, translate],
  )

  const handleCancel = useCallback(() => {
    browserHistory.goBack()
  }, [browserHistory])

  const handlePercentClick = useCallback(
    (percent: number) => {
      const cryptoAmount = bnOrZero(amountAvailableCryptoPrecision).times(percent)
      const fiatAmount = bnOrZero(cryptoAmount).times(assetMarketData.price)
      setValue(Field.FiatAmount, fiatAmount.toString(), { shouldValidate: true })
      setValue(Field.CryptoAmount, cryptoAmount.toFixed(), { shouldValidate: true })
    },
    [amountAvailableCryptoPrecision, assetMarketData, setValue],
  )

  const validateCryptoAmount = useCallback(
    (value: string) => {
      if (!opportunityData?.stakedAmountCryptoBaseUnit) return false
      if (!outboundFeeCryptoBaseUnit) return false

      const balanceCryptoPrecision = bnOrZero(amountAvailableCryptoPrecision.toPrecision())
      const valueCryptoPrecision = bnOrZero(value)
      const valueCryptoBaseUnit = bn(value).times(bn(10).pow(asset.precision))

      const hasValidBalance =
        balanceCryptoPrecision.gt(0) &&
        valueCryptoPrecision.gt(0) &&
        balanceCryptoPrecision.gte(valueCryptoPrecision)
      const isBelowWithdrawThreshold = valueCryptoBaseUnit.minus(outboundFeeCryptoBaseUnit).lte(0)

      if (isBelowWithdrawThreshold) {
        const minLimitCryptoPrecision = bn(outboundFeeCryptoBaseUnit).div(
          bn(10).pow(asset.precision),
        )
        const minLimit = `${minLimitCryptoPrecision} ${asset.symbol}`
        return translate('trade.errors.amountTooSmall', {
          minLimit,
        })
      }

      if (valueCryptoPrecision.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [
      amountAvailableCryptoPrecision,
      asset.precision,
      asset.symbol,
      opportunityData?.stakedAmountCryptoBaseUnit,
      outboundFeeCryptoBaseUnit,
      translate,
    ],
  )

  const validateFiatAmount = useCallback(
    (value: string) => {
      const crypto = bnOrZero(amountAvailableCryptoPrecision.toPrecision())
      const fiat = crypto.times(assetMarketData.price)
      const _value = bnOrZero(value)
      const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [amountAvailableCryptoPrecision, assetMarketData],
  )

  if (!state) return null

  return (
    <FormProvider {...methods}>
      <ReusableWithdraw
        asset={asset}
        cryptoAmountAvailable={amountAvailableCryptoPrecision.toPrecision()}
        cryptoInputValidation={{
          required: true,
          validate: { validateCryptoAmount },
        }}
        fiatAmountAvailable={fiatAmountAvailable.toString()}
        fiatInputValidation={{
          required: true,
          validate: { validateFiatAmount },
        }}
        marketData={{
          // The vault asset doesnt have market data.
          // We're making our own market data object for the withdraw view
          price: assetMarketData.price,
          marketCap: '0',
          volume: '0',
          changePercent24Hr: 0,
        }}
        onCancel={handleCancel}
        onContinue={handleContinue}
        isLoading={state.loading}
        percentOptions={[0.25, 0.5, 0.75, 1]}
        enableSlippage={false}
        handlePercentClick={handlePercentClick}
      />
    </FormProvider>
  )
}
