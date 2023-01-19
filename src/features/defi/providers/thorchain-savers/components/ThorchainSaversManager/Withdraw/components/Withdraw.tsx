import { useToast } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import type { UtxoBaseAdapter, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useContext, useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import {
  getThorchainSaversWithdrawQuote,
  getWithdrawBps,
} from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'
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
        const withdrawBps = getWithdrawBps(
          amountCryptoBaseUnit,
          opportunityData?.stakedAmountCryptoBaseUnit,
          opportunityData?.rewardsAmountsCryptoBaseUnit?.[0] ?? '0',
        )

        const quote = await getThorchainSaversWithdrawQuote(asset, accountId, withdrawBps)
        const chainAdapters = getChainAdapterManager()
        const adapter = chainAdapters.get(chainId) as unknown as UtxoBaseAdapter<UtxoChainId>
        const fee = (
          await adapter.getFeeData({
            to: quote.inbound_address,
            value: amountCryptoBaseUnit.toFixed(0),
            chainSpecific: { pubkey: userAddress, from: '' },
            sendMax: false,
          })
        ).fast.txFee
        // We might need a dust reconciliation Tx for UTXOs, so we assume gas * 2
        return bnOrZero(fee)
          .times(isUtxoChainId(chainId) ? 2 : 1)
          .toString()
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

  const handleContinue = useCallback(
    async (formValues: WithdrawValues) => {
      if (!(userAddress && opportunityData && dispatch)) return
      // set deposit state for future use
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
      const crypto = bnOrZero(amountAvailableCryptoPrecision.toPrecision())
      const _value = bnOrZero(value)
      const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
      if (_value.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [amountAvailableCryptoPrecision],
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
