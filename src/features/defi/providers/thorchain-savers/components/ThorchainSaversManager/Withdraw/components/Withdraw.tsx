import { Skeleton, useToast } from '@chakra-ui/react'
import { AddressZero } from '@ethersproject/constants'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { GetFeeDataInput, UtxoBaseAdapter, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import { Err, Ok, type Result } from '@sniptt/monads'
import { getOrCreateContractByType } from 'contracts/contractManager'
import { ContractType } from 'contracts/types'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useContext, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Row } from 'components/Row/Row'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { getSupportedEvmChainIds } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { useRouterContractAddress } from 'lib/swapper/swappers/ThorchainSwapper/utils/useRouterContractAddress'
import { isToken } from 'lib/utils'
import { assertGetEvmChainAdapter, createBuildCustomTxInput } from 'lib/utils/evm'
import type { ThorchainSaversWithdrawQuoteResponseSuccess } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/types'
import {
  BASE_BPS_POINTS,
  fromThorBaseUnit,
  getThorchainSaversWithdrawQuote,
  getWithdrawBps,
  THORCHAIN_SAVERS_DUST_THRESHOLDS,
} from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectFeeAssetById,
  selectHighestBalanceAccountIdByStakingId,
  selectMarketDataById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ThorchainSaversWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

type WithdrawProps = StepComponentProps & { accountId: AccountId | undefined }

const percentOptions = [0.25, 0.5, 0.75, 1]

export const Withdraw: React.FC<WithdrawProps> = ({ accountId, onNext }) => {
  const [slippageCryptoAmountPrecision, setSlippageCryptoAmountPrecision] = useState<string | null>(
    null,
  )
  const [quoteLoading, setQuoteLoading] = useState(false)
  const { state, dispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const toast = useToast()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query

  const methods = useForm<WithdrawValues>({ mode: 'onChange' })
  const { getValues, setValue } = methods

  // Asset info

  const assets = useAppSelector(selectAssets)
  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const accountNumberFilter = useMemo(() => ({ accountId }), [accountId])
  const accountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, accountNumberFilter),
  )

  const {
    state: { wallet },
  } = useWallet()
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId))
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
  if (!feeAsset) throw new Error(`Fee Asset not found for AssetId ${assetId}`)

  const isTokenWithdraw = isToken(fromAssetId(assetId).assetReference)

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

  const getOutboundFeeCryptoBaseUnit = useCallback(
    async (
      _quote?: Result<ThorchainSaversWithdrawQuoteResponseSuccess, string>,
    ): Promise<Result<string, string> | null> => {
      if (!accountId) return null

      const maybeQuote = await (async () => {
        if (_quote && _quote.isOk()) return _quote

        // Attempt getting a quote with 100000 bps, i.e 100% withdraw
        // - If this succeeds, this allows us to know the oubtound fee, which is always the same regarding of the withdraw bps
        // and will allow us to gracefully handle amounts that are lower than the outbound fee
        // - If this fails, we know that the withdraw amount is too low anyway, regarding of how many bps are withdrawn
        setQuoteLoading(true)
        const quote = await getThorchainSaversWithdrawQuote({ asset, accountId, bps: '10000' })
        setQuoteLoading(false)
        return quote
      })()

      // Neither the passed quote, nor the safer 10,000 bps quote succeeded
      // Meaning the amount being withdraw *is* too small
      if (maybeQuote.isErr()) {
        console.error(maybeQuote.unwrapErr())
        return Err(translate('trade.errors.amountTooSmallUnknownMinimum'))
      }

      const quote = maybeQuote.unwrap()

      const outboundFee = bnOrZero(
        toBaseUnit(fromThorBaseUnit(quote.fees.outbound), asset.precision),
      )
      const safeOutboundFee = bn(outboundFee).times(105).div(100).toFixed(0)
      // Add 5% as as a safety factor since the dust threshold fee is not necessarily going to cut it
      return Ok(safeOutboundFee)
    },
    [accountId, asset, translate],
  )

  const supportedEvmChainIds = useMemo(() => getSupportedEvmChainIds(), [])

  const saversRouterContractAddress = useRouterContractAddress({
    feeAssetId: feeAsset?.assetId ?? '',
    skip: !isTokenWithdraw || !feeAsset?.assetId,
  })

  const getWithdrawGasEstimateCryptoBaseUnit = useCallback(
    async (
      maybeQuote: Result<ThorchainSaversWithdrawQuoteResponseSuccess, string>,
      dustAmountCryptoBaseUnit: string,
    ): Promise<Result<string, string> | null> => {
      if (!(userAddress && accountId && wallet && accountNumber !== undefined)) return null
      const inputValues = getValues()
      try {
        const maybeOutboundFeeCryptoBaseUnit = await getOutboundFeeCryptoBaseUnit(maybeQuote)
        if (!maybeOutboundFeeCryptoBaseUnit) return null
        const amountCryptoBaseUnit = toBaseUnit(inputValues.cryptoAmount, asset.precision)

        // re-returning the outbound fee error, which should take precedence over the withdraw gas estimation one
        if (maybeOutboundFeeCryptoBaseUnit.isErr()) return maybeOutboundFeeCryptoBaseUnit

        const chainAdapters = getChainAdapterManager()

        if (isTokenWithdraw) {
          if (!saversRouterContractAddress)
            return Err(`No router contract address found for feeAsset: ${feeAsset.assetId}`)

          const adapter = assertGetEvmChainAdapter(chainId)
          const thorContract = getOrCreateContractByType({
            address: saversRouterContractAddress,
            type: ContractType.ThorRouter,
            chainId: asset.chainId,
          })

          if (maybeQuote.isErr())
            return Err(
              translate('trade.errors.amountTooSmallUnknownMinimum', {
                assetSymbol: feeAsset.symbol,
              }),
            )
          const quote = maybeQuote.unwrap()

          const data = thorContract.interface.encodeFunctionData('depositWithExpiry', [
            quote.inbound_address,
            // This looks incorrect according to https://dev.thorchain.org/thorchain-dev/concepts/sending-transactions#evm-chains
            // But this is how THORSwap does it, and it actually works - using the actual asset address as "asset" will result in reverts
            AddressZero,
            amountCryptoBaseUnit,
            quote.memo,
            quote.expiry,
          ])

          const amount = THORCHAIN_SAVERS_DUST_THRESHOLDS[feeAsset.assetId]

          const customTxInput = await createBuildCustomTxInput({
            accountNumber,
            adapter,
            data,
            value: amount,
            to: saversRouterContractAddress,
            wallet,
          })

          const fees = await adapter.getFeeData({
            to: customTxInput.to,
            value: customTxInput.value,
            chainSpecific: {
              from: fromAccountId(accountId).account,
              data: customTxInput.data,
            },
          })

          const fastFeeCryptoBaseUnit = fees.fast.txFee

          return Ok(bnOrZero(fastFeeCryptoBaseUnit).toString())
        }

        // Quote errors aren't necessarily user-friendly, we don't want to return them
        if (maybeQuote.isErr()) throw new Error(maybeQuote.unwrapErr())
        const quote = maybeQuote.unwrap()
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
        return Ok(bnOrZero(fastFeeCryptoBaseUnit).toString())
      } catch (error) {
        console.error(error)
        // Assume insufficient amount for gas if we've thrown on the try block above
        return Err(translate('common.insufficientAmountForGas', { assetSymbol: feeAsset.symbol }))
      }
    },
    [
      userAddress,
      accountId,
      wallet,
      accountNumber,
      getValues,
      getOutboundFeeCryptoBaseUnit,
      asset.precision,
      asset.chainId,
      isTokenWithdraw,
      chainId,
      supportedEvmChainIds,
      saversRouterContractAddress,
      feeAsset.assetId,
      feeAsset.symbol,
      translate,
    ],
  )

  const handleContinue = useCallback(
    async (formValues: WithdrawValues) => {
      if (!(userAddress && opportunityData && accountId && dispatch)) return

      const inputValues = getValues()

      // set withdraw state for future use
      dispatch({ type: ThorchainSaversWithdrawActionType.SET_WITHDRAW, payload: formValues })
      dispatch({ type: ThorchainSaversWithdrawActionType.SET_LOADING, payload: true })
      try {
        const { cryptoAmount } = inputValues
        const amountCryptoBaseUnit = toBaseUnit(cryptoAmount, asset.precision)
        const withdrawBps = getWithdrawBps({
          withdrawAmountCryptoBaseUnit: amountCryptoBaseUnit,
          stakedAmountCryptoBaseUnit: opportunityData.stakedAmountCryptoBaseUnit ?? '0',
          rewardsAmountCryptoBaseUnit: opportunityData.rewardsCryptoBaseUnit?.amounts[0] ?? '0',
        })
        setQuoteLoading(true)
        const maybeQuote = await getThorchainSaversWithdrawQuote({
          asset,
          accountId,
          bps: withdrawBps,
        })
        setQuoteLoading(false)

        if (maybeQuote.isErr()) throw new Error(maybeQuote.unwrapErr())
        const quote = maybeQuote.unwrap()
        const { dust_amount } = quote
        const _dustAmountCryptoBaseUnit = toBaseUnit(fromThorBaseUnit(dust_amount), asset.precision)

        const maybeWithdrawGasEstimateCryptoBaseUnit = await getWithdrawGasEstimateCryptoBaseUnit(
          maybeQuote,
          _dustAmountCryptoBaseUnit,
        )
        if (!maybeWithdrawGasEstimateCryptoBaseUnit) return
        if (maybeWithdrawGasEstimateCryptoBaseUnit.isErr()) return

        const estimatedGasCryptoBaseUnit = maybeWithdrawGasEstimateCryptoBaseUnit.unwrap()
        dispatch({
          type: ThorchainSaversWithdrawActionType.SET_WITHDRAW,
          payload: { estimatedGasCryptoBaseUnit },
        })

        onNext(DefiStep.Confirm)

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
      } finally {
        dispatch({ type: ThorchainSaversWithdrawActionType.SET_LOADING, payload: false })
      }
    },
    [
      userAddress,
      opportunityData,
      accountId,
      dispatch,
      getValues,
      asset,
      getWithdrawGasEstimateCryptoBaseUnit,
      onNext,
      assetId,
      assets,
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
    },
    [amountAvailableCryptoPrecision, assetMarketData, setValue],
  )

  const validateCryptoAmount = useCallback(
    async (value: string) => {
      if (!opportunityData) return false
      if (!accountId) return false
      if (!dispatch) return false

      try {
        const cryptoAmount = value
        const amountCryptoBaseUnit = toBaseUnit(cryptoAmount, asset.precision)
        const withdrawBps = getWithdrawBps({
          withdrawAmountCryptoBaseUnit: amountCryptoBaseUnit,
          stakedAmountCryptoBaseUnit: opportunityData.stakedAmountCryptoBaseUnit ?? '0',
          rewardsAmountCryptoBaseUnit: opportunityData.rewardsCryptoBaseUnit?.amounts[0] ?? '0',
        })

        setQuoteLoading(true)
        const maybeQuote = await getThorchainSaversWithdrawQuote({
          asset,
          accountId,
          bps: withdrawBps,
        })

        const maybeOutboundFeeCryptoBaseUnit = await getOutboundFeeCryptoBaseUnit(maybeQuote)
        if (maybeQuote.isErr()) return translate('trade.errors.amountTooSmallUnknownMinimum')
        const quote = maybeQuote.unwrap()
        const { slippage_bps, dust_amount } = quote

        const percentage = bnOrZero(slippage_bps).div(BASE_BPS_POINTS).times(100)
        // total downside (slippage going into position) - 0.007 ETH for 5 ETH deposit
        const cryptoSlippageAmountPrecision = bnOrZero(cryptoAmount).times(percentage).div(100)
        setSlippageCryptoAmountPrecision(cryptoSlippageAmountPrecision.toString())

        const _dustAmountCryptoBaseUnit = toBaseUnit(fromThorBaseUnit(dust_amount), asset.precision)

        const maybeWithdrawGasEstimateCryptoBaseUnit = await getWithdrawGasEstimateCryptoBaseUnit(
          maybeQuote,
          _dustAmountCryptoBaseUnit,
        )

        if (!maybeOutboundFeeCryptoBaseUnit) return false
        if (!maybeWithdrawGasEstimateCryptoBaseUnit) return false

        if (maybeWithdrawGasEstimateCryptoBaseUnit?.isErr()) {
          return maybeWithdrawGasEstimateCryptoBaseUnit.unwrapErr()
        }

        if (maybeOutboundFeeCryptoBaseUnit.isErr()) {
          return maybeOutboundFeeCryptoBaseUnit.unwrapErr()
        }

        const outboundFeeCryptoBaseUnit = maybeOutboundFeeCryptoBaseUnit.unwrap()

        const balanceCryptoPrecision = bnOrZero(amountAvailableCryptoPrecision.toPrecision())
        const valueCryptoPrecision = bnOrZero(value)
        const valueCryptoBaseUnit = toBaseUnit(value, asset.precision)

        const hasValidBalance =
          balanceCryptoPrecision.gt(0) &&
          valueCryptoPrecision.gt(0) &&
          balanceCryptoPrecision.gte(valueCryptoPrecision)
        const isBelowWithdrawThreshold = bn(valueCryptoBaseUnit)
          .minus(outboundFeeCryptoBaseUnit)
          .lt(0)

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
      } catch (e) {
        // This should never happen since all errors are monadic, but allows us to use the finally block
        console.error(e)
      } finally {
        setQuoteLoading(false)
        dispatch({ type: ThorchainSaversWithdrawActionType.SET_LOADING, payload: false })
      }
    },
    [
      opportunityData,
      accountId,
      asset,
      getOutboundFeeCryptoBaseUnit,
      translate,
      getWithdrawGasEstimateCryptoBaseUnit,
      amountAvailableCryptoPrecision,
      dispatch,
    ],
  )

  const validateFiatAmount = useCallback(
    (value: string) => {
      if (!(opportunityData && accountId && dispatch)) return false
      dispatch({ type: ThorchainSaversWithdrawActionType.SET_LOADING, payload: true })

      try {
        const crypto = bnOrZero(amountAvailableCryptoPrecision.toPrecision())

        const fiat = crypto.times(assetMarketData.price)
        const valueCryptoPrecision = bnOrZero(value)

        const hasValidBalance = fiat.gt(0) && valueCryptoPrecision.gt(0) && fiat.gte(value)
        if (valueCryptoPrecision.isEqualTo(0)) return ''
        return hasValidBalance || 'common.insufficientFunds'
      } catch (e) {
        // This should never happen since all errors are monadic, but allows us to use the finally block
        console.error(e)
      } finally {
        setQuoteLoading(false)
        dispatch({ type: ThorchainSaversWithdrawActionType.SET_LOADING, payload: false })
      }
    },
    [accountId, amountAvailableCryptoPrecision, assetMarketData.price, dispatch, opportunityData],
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

  const marketData = useMemo(
    () => ({
      // The vault asset doesnt have market data.
      // We're making our own market data object for the withdraw view
      price: assetMarketData.price,
      marketCap: '0',
      volume: '0',
      changePercent24Hr: 0,
    }),
    [assetMarketData],
  )

  if (!state) return null

  return (
    <FormProvider {...methods}>
      <ReusableWithdraw
        asset={asset}
        cryptoAmountAvailable={amountAvailableCryptoPrecision.toPrecision()}
        cryptoInputValidation={cryptoInputValidation}
        fiatAmountAvailable={fiatAmountAvailable.toString()}
        fiatInputValidation={fiatInputValidation}
        marketData={marketData}
        onCancel={handleCancel}
        onContinue={handleContinue}
        isLoading={state.loading}
        percentOptions={percentOptions}
        enableSlippage={false}
        handlePercentClick={handlePercentClick}
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
