import { Skeleton, useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import type { GetFeeDataInput, UtxoBaseAdapter, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import { getConfig } from 'config'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import debounce from 'lodash/debounce'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Row } from 'components/Row/Row'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { getSupportedEvmChainIds } from 'hooks/useEvm/useEvm'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { getInboundAddressDataForChain } from 'lib/swapper/swappers/ThorchainSwapper/utils/getInboundAddressDataForChain'
import {
  BASE_BPS_POINTS,
  fromThorBaseUnit,
  getThorchainSaversWithdrawQuote,
  getWithdrawBps,
} from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectHighestBalanceAccountIdByStakingId,
  selectMarketDataById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ThorchainSaversWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

type WithdrawProps = StepComponentProps & { accountId: AccountId | undefined }

export const Withdraw: React.FC<WithdrawProps> = ({ accountId, onNext }) => {
  const [dustAmountCryptoBaseUnit, setDustAmountCryptoBaseUnit] = useState<string>('')
  const [outboundFeeCryptoBaseUnit, setOutboundFeeCryptoBaseUnit] = useState('')
  const [slippageCryptoAmountPrecision, setSlippageCryptoAmountPrecision] = useState<string | null>(
    null,
  )
  const [inputValues, setInputValues] = useState<{
    fiatAmount: string
    cryptoAmount: string
  } | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const { state, dispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const toast = useToast()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query

  const methods = useForm<WithdrawValues>({ mode: 'onChange' })

  const { setValue } = methods
  // Asset info

  const assets = useAppSelector(selectAssets)
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

  const userAddress: string | undefined = accountId && fromAccountId(accountId).account

  // user info
  const amountAvailableCryptoPrecision = useMemo(() => {
    return bnOrZero(opportunityData?.stakedAmountCryptoBaseUnit)
      .plus(bnOrZero(opportunityData?.rewardsCryptoBaseUnit?.amounts[0])) // Savers rewards are denominated in a single asset
      .div(bn(10).pow(asset.precision))
  }, [
    asset.precision,
    opportunityData?.rewardsCryptoBaseUnit,
    opportunityData?.stakedAmountCryptoBaseUnit,
  ])

  const assetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const fiatAmountAvailable = useMemo(
    () => bnOrZero(amountAvailableCryptoPrecision).times(assetMarketData.price),
    [amountAvailableCryptoPrecision, assetMarketData.price],
  )

  const getOutboundFeeCryptoBaseUnit = useCallback(async () => {
    const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
    const maybeInboundAddressData = await getInboundAddressDataForChain(daemonUrl, assetId)

    return maybeInboundAddressData.match({
      ok: ({ outbound_fee }) => {
        const outboundFeeCryptoBaseUnit = toBaseUnit(
          fromThorBaseUnit(outbound_fee),
          asset.precision,
        )
        return outboundFeeCryptoBaseUnit
      },
      err: () => undefined,
    })
  }, [asset.precision, assetId])

  const supportedEvmChainIds = useMemo(() => getSupportedEvmChainIds(), [])

  const getWithdrawGasEstimate = useCallback(
    async (withdraw: WithdrawValues) => {
      if (
        !(
          userAddress &&
          assetReference &&
          accountId &&
          opportunityData?.stakedAmountCryptoBaseUnit &&
          dustAmountCryptoBaseUnit
        )
      )
        return
      try {
        const amountCryptoBaseUnit = bnOrZero(withdraw.cryptoAmount).times(
          bn(10).pow(asset.precision),
        )
        const withdrawBps = getWithdrawBps({
          withdrawAmountCryptoBaseUnit: amountCryptoBaseUnit,
          stakedAmountCryptoBaseUnit: opportunityData?.stakedAmountCryptoBaseUnit,
          rewardsAmountCryptoBaseUnit: opportunityData?.rewardsCryptoBaseUnit?.amounts[0] ?? '0',
        })

        const quote = await getThorchainSaversWithdrawQuote({ asset, accountId, bps: withdrawBps })
        const chainAdapters = getChainAdapterManager()
        // We're lying to Ts, this isn't always an UtxoBaseAdapter
        // But typing this as any chain-adapter won't narrow down its type and we'll have errors at `chainSpecific` property
        const adapter = chainAdapters.get(chainId) as unknown as UtxoBaseAdapter<UtxoChainId>
        const getFeeDataInput: GetFeeDataInput<UtxoChainId> = {
          to: quote.inbound_address,
          value: dustAmountCryptoBaseUnit,
          // EVM chains are the only ones explicitly requiring a `from` param for the gas estimation to work
          // UTXOs simply call /api/v1/fees (common for all accounts), and Cosmos assets fees are hardcoded
          chainSpecific: {
            pubkey: userAddress,
            from: supportedEvmChainIds.includes(chainId) ? userAddress : '',
          },
          sendMax: false,
        }
        const fastFeeCryptoBaseUnit = (await adapter.getFeeData(getFeeDataInput)).fast.txFee

        const fastFeeCryptoPrecision = bnOrZero(
          bn(fastFeeCryptoBaseUnit).div(bn(10).pow(asset.precision)),
        )
        return bnOrZero(fastFeeCryptoPrecision).toString()
      } catch (error) {
        console.error(error)
        toast({
          position: 'top-right',
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
      }
    },
    [
      userAddress,
      assetReference,
      accountId,
      opportunityData?.stakedAmountCryptoBaseUnit,
      opportunityData?.rewardsCryptoBaseUnit,
      dustAmountCryptoBaseUnit,
      asset,
      chainId,
      supportedEvmChainIds,
      toast,
      translate,
    ],
  )

  useEffect(() => {
    ;(async () => {
      if (outboundFeeCryptoBaseUnit) return

      const dustThresholdFee = await getOutboundFeeCryptoBaseUnit()
      if (!dustThresholdFee) return ''

      // Add 5% as as a safety factor since the dust threshold fee is not necessarily going to cut it
      const safeOutboundFee = bn(dustThresholdFee).times(105).div(100).toString()
      setOutboundFeeCryptoBaseUnit(safeOutboundFee ?? '')
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
        trackOpportunityEvent(
          MixPanelEvents.WithdrawContinue,
          {
            opportunity: opportunityData,
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
        dispatch({ type: ThorchainSaversWithdrawActionType.SET_LOADING, payload: false })
      }
    },
    [
      assets,
      userAddress,
      opportunityData,
      dispatch,
      getWithdrawGasEstimate,
      onNext,
      assetId,
      toast,
      translate,
    ],
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
      handleInputChange(fiatAmount.toString(), cryptoAmount.toString())
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
      const isBelowWithdrawThreshold = valueCryptoBaseUnit.minus(outboundFeeCryptoBaseUnit).lt(0)

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
      if (!outboundFeeCryptoBaseUnit) return false
      const crypto = bnOrZero(amountAvailableCryptoPrecision.toPrecision())

      const fiat = crypto.times(assetMarketData.price)
      const valueCryptoPrecision = bnOrZero(value)
      const valueCryptoBaseUnit = bnOrZero(value)
        .div(assetMarketData.price)
        .times(bn(10).pow(asset.precision))

      const isBelowWithdrawThreshold = valueCryptoBaseUnit.minus(outboundFeeCryptoBaseUnit).lt(0)

      if (isBelowWithdrawThreshold) {
        const minLimitCryptoPrecision = bn(outboundFeeCryptoBaseUnit).div(
          bn(10).pow(asset.precision),
        )
        const minLimit = `${minLimitCryptoPrecision} ${asset.symbol}`
        return translate('trade.errors.amountTooSmall', {
          minLimit,
        })
      }

      const hasValidBalance = fiat.gt(0) && valueCryptoPrecision.gt(0) && fiat.gte(value)
      if (valueCryptoPrecision.isEqualTo(0)) return ''
      return hasValidBalance || 'common.insufficientFunds'
    },
    [
      amountAvailableCryptoPrecision,
      asset.precision,
      asset.symbol,
      assetMarketData.price,
      outboundFeeCryptoBaseUnit,
      translate,
    ],
  )

  useEffect(() => {
    if (!(accountId && inputValues && asset && opportunityData?.stakedAmountCryptoBaseUnit)) return
    const { cryptoAmount } = inputValues
    const amountCryptoBaseUnit = bnOrZero(cryptoAmount).times(bn(10).pow(asset.precision))

    if (amountCryptoBaseUnit.isZero()) return

    const debounced = debounce(async () => {
      setQuoteLoading(true)
      const withdrawBps = getWithdrawBps({
        withdrawAmountCryptoBaseUnit: amountCryptoBaseUnit,
        stakedAmountCryptoBaseUnit: opportunityData?.stakedAmountCryptoBaseUnit ?? '0',
        rewardsAmountCryptoBaseUnit: opportunityData?.rewardsCryptoBaseUnit?.amounts[0] ?? '0',
      })

      const quote = await getThorchainSaversWithdrawQuote({ asset, accountId, bps: withdrawBps })
      const { dust_amount, slippage_bps } = quote
      const percentage = bnOrZero(slippage_bps).div(BASE_BPS_POINTS).times(100)

      // total downside (slippage going into position) - 0.007 ETH for 5 ETH deposit
      const cryptoSlippageAmountPrecision = bnOrZero(cryptoAmount).times(percentage).div(100)
      setSlippageCryptoAmountPrecision(cryptoSlippageAmountPrecision.toString())

      setDustAmountCryptoBaseUnit(
        bnOrZero(toBaseUnit(fromThorBaseUnit(dust_amount), asset.precision)).toFixed(
          asset.precision,
        ),
      )
      setQuoteLoading(false)
    })

    debounced()

    // cancel the previous debounce when inputValues changes to avoid race conditions
    // and always ensure the latest value is used
    return debounced.cancel
  }, [
    accountId,
    asset,
    inputValues,
    opportunityData?.apy,
    opportunityData?.rewardsCryptoBaseUnit,
    opportunityData?.stakedAmountCryptoBaseUnit,
  ])

  const handleInputChange = (fiatAmount: string, cryptoAmount: string) => {
    setInputValues({ fiatAmount, cryptoAmount })
  }

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
        onChange={handleInputChange}
      >
        <Row>
          <Row.Label>{translate('common.slippage')}</Row.Label>
          <Row.Value>
            <Skeleton isLoaded={!quoteLoading}>
              <Amount.Crypto value={slippageCryptoAmountPrecision ?? ''} symbol={asset.symbol} />
            </Skeleton>
          </Row.Value>
        </Row>
      </ReusableWithdraw>
    </FormProvider>
  )
}
