import { Alert, AlertIcon, Skeleton, useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { thorchainAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { convertPercentageToBasisPoints } from '@shapeshiftoss/utils'
import { Err, Ok, type Result } from '@sniptt/monads'
import { useQueryClient } from '@tanstack/react-query'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { Field, Withdraw as ReusableWithdraw } from 'features/defi/components/Withdraw/Withdraw'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import pDebounce from 'p-debounce'
import { useCallback, useContext, useMemo, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { fetchHasEnoughBalanceForTxPlusFeesPlusSweep } from 'lib/utils/thorchain/balance'
import { BASE_BPS_POINTS } from 'lib/utils/thorchain/constants'
import type { GetThorchainSaversWithdrawQuoteQueryKey } from 'lib/utils/thorchain/hooks/useGetThorchainSaversWithdrawQuoteQuery'
import {
  fetchThorchainWithdrawQuote,
  useGetThorchainSaversWithdrawQuoteQuery,
} from 'lib/utils/thorchain/hooks/useGetThorchainSaversWithdrawQuoteQuery'
import { useSendThorTx } from 'lib/utils/thorchain/hooks/useSendThorTx'
import { isUtxoChainId } from 'lib/utils/utxo'
import { useIsSweepNeededQuery } from 'pages/Lending/hooks/useIsSweepNeededQuery'
import type { ThorchainSaversWithdrawQuoteResponseSuccess } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/types'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectFeeAssetById,
  selectHighestStakingBalanceAccountIdByStakingId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ThorchainSaversWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

type WithdrawProps = StepComponentProps & {
  accountId: AccountId | undefined
  fromAddress: string | undefined
}

const percentOptions = [0.25, 0.5, 0.75, 1]

export const Withdraw: React.FC<WithdrawProps> = ({ accountId, fromAddress, onNext }) => {
  const [slippageCryptoAmountPrecision, setSlippageCryptoAmountPrecision] = useState<string>()
  const [missingFunds, setMissingFunds] = useState<string | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const { state, dispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query

  const methods = useForm<WithdrawValues>({ mode: 'onChange' })
  const { control, setValue } = methods

  const cryptoAmount = useWatch<WithdrawValues, Field.CryptoAmount>({
    control,
    name: Field.CryptoAmount,
  })

  const assets = useAppSelector(selectAssets)
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })

  const isRunePool = assetId === thorchainAssetId

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
  if (!feeAsset) throw new Error(`Fee Asset not found for AssetId ${assetId}`)

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

  const balanceFilter = useMemo(() => ({ assetId, accountId }), [accountId, assetId])
  const balanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, balanceFilter),
  )

  const assetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId),
  )
  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )

  const assetPriceInFeeAsset = useMemo(() => {
    return bn(assetMarketData.price).div(feeAssetMarketData.price)
  }, [assetMarketData.price, feeAssetMarketData.price])

  const fiatAmountAvailable = useMemo(
    () => bnOrZero(amountAvailableCryptoPrecision).times(assetMarketData.price),
    [amountAvailableCryptoPrecision, assetMarketData.price],
  )

  // TODO(gomes): this will work for UTXO but is invalid for tokens since they use diff. denoms
  // the current workaround is to not do fee deduction for non-UTXO chains,
  // but for consistency, we should for native EVM assets, and ensure this is a no-op for tokens
  // Note when implementing this, fee checks/deduction will need to either be done for *native* assets only
  // or handle different denoms for tokens/native assets and display insufficientFundsForProtocolFee copy
  const getHasEnoughBalanceForTxPlusFees = useCallback(
    ({
      balanceCryptoBaseUnit,
      amountCryptoPrecision,
      txFeeCryptoBaseUnit,
      precision,
    }: {
      balanceCryptoBaseUnit: string
      amountCryptoPrecision: string
      txFeeCryptoBaseUnit: string
      precision: number
    }) => {
      const balanceCryptoBaseUnitBn = bnOrZero(balanceCryptoBaseUnit)
      if (balanceCryptoBaseUnitBn.isZero()) return false

      return bnOrZero(amountCryptoPrecision)
        .plus(fromBaseUnit(txFeeCryptoBaseUnit, precision ?? 0))
        .lte(fromBaseUnit(balanceCryptoBaseUnitBn, precision))
    },
    [],
  )

  const hasEnoughStakingBalance = useMemo(
    () => bnOrZero(cryptoAmount).lte(amountAvailableCryptoPrecision),
    [amountAvailableCryptoPrecision, cryptoAmount],
  )
  const { data: thorchainSaversWithdrawQuote, isLoading: isThorchainSaversWithdrawQuoteLoading } =
    useGetThorchainSaversWithdrawQuoteQuery({
      asset,
      accountId,
      amountCryptoBaseUnit: toBaseUnit(cryptoAmount, asset.precision),
      enabled: hasEnoughStakingBalance && !isRunePool,
    })

  const memo = useMemo(() => {
    if (thorchainSaversWithdrawQuote?.memo) return thorchainSaversWithdrawQuote.memo

    const balanceCryptoPrecision = bnOrZero(amountAvailableCryptoPrecision.toPrecision())
    const percent = bnOrZero(cryptoAmount).div(balanceCryptoPrecision).times(100).toFixed(0)
    const basisPoints = convertPercentageToBasisPoints(percent)

    if (isRunePool) return `pool-:${basisPoints}`

    return null
  }, [isRunePool, thorchainSaversWithdrawQuote, amountAvailableCryptoPrecision, cryptoAmount])

  const {
    estimatedFeesData,
    isEstimatedFeesDataLoading,
    dustAmountCryptoBaseUnit,
    outboundFeeCryptoBaseUnit,
  } = useSendThorTx({
    assetId,
    accountId: accountId ?? '',
    // withdraw savers will use dust amount and runepool will use the memo
    amountCryptoBaseUnit: null,
    memo,
    fromAddress: fromAddress ?? null,
    action: isRunePool ? 'withdrawRunepool' : 'withdrawSavers',
  })

  const isSweepNeededArgs = useMemo(
    () => ({
      assetId,
      address: fromAddress,
      amountCryptoBaseUnit: dustAmountCryptoBaseUnit,
      txFeeCryptoBaseUnit: estimatedFeesData?.txFeeCryptoBaseUnit ?? '0',
      // Don't fetch sweep needed if there isn't enough balance for the dust amount + fees, since adding in a sweep Tx would obviously fail too
      enabled: Boolean(
        estimatedFeesData &&
          getHasEnoughBalanceForTxPlusFees({
            precision: asset.precision,
            balanceCryptoBaseUnit,
            amountCryptoPrecision: fromBaseUnit(dustAmountCryptoBaseUnit, feeAsset.precision),
            txFeeCryptoBaseUnit: estimatedFeesData.txFeeCryptoBaseUnit,
          }),
      ),
    }),
    [
      asset.precision,
      assetId,
      balanceCryptoBaseUnit,
      dustAmountCryptoBaseUnit,
      estimatedFeesData,
      feeAsset.precision,
      fromAddress,
      getHasEnoughBalanceForTxPlusFees,
    ],
  )

  const { data: isSweepNeeded, isLoading: isSweepNeededLoading } =
    useIsSweepNeededQuery(isSweepNeededArgs)

  const handleContinue = useCallback(
    (formValues: WithdrawValues) => {
      if (!dispatch || !estimatedFeesData || !opportunityData) return

      // set withdraw state for future use
      dispatch({ type: ThorchainSaversWithdrawActionType.SET_WITHDRAW, payload: formValues })
      dispatch({ type: ThorchainSaversWithdrawActionType.SET_LOADING, payload: true })

      try {
        dispatch({
          type: ThorchainSaversWithdrawActionType.SET_WITHDRAW,
          payload: {
            estimatedGasCryptoBaseUnit: estimatedFeesData.txFeeCryptoBaseUnit,
            networkFeeCryptoBaseUnit: estimatedFeesData.txFeeCryptoBaseUnit,
          },
        })

        onNext(isSweepNeeded ? DefiStep.Sweep : DefiStep.Confirm)

        trackOpportunityEvent(
          MixPanelEvent.WithdrawContinue,
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
      opportunityData,
      dispatch,
      onNext,
      isSweepNeeded,
      assetId,
      assets,
      estimatedFeesData,
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
      setValue(Field.CryptoAmount, cryptoAmount.toFixed(asset.precision), { shouldValidate: true })
    },
    [amountAvailableCryptoPrecision, asset.precision, assetMarketData.price, setValue],
  )

  const outboundFeeInAssetCryptoBaseUnit = useMemo(() => {
    if (!asset) return bn(0)
    if (!feeAsset) return bn(0)
    if (!outboundFeeCryptoBaseUnit) return bn(0)

    const outboundFeeCryptoPrecision = fromBaseUnit(outboundFeeCryptoBaseUnit, feeAsset.precision)
    const outboundFeeInAssetCryptoPrecision = bn(outboundFeeCryptoPrecision).div(
      assetPriceInFeeAsset,
    )

    return toBaseUnit(outboundFeeInAssetCryptoPrecision, asset.precision)
  }, [outboundFeeCryptoBaseUnit, assetPriceInFeeAsset, asset, feeAsset])

  const safeOutboundFeeInAssetCryptoBaseUnit = useMemo(() => {
    if (!outboundFeeInAssetCryptoBaseUnit) return
    // Add 5% as as a safety factor since the dust threshold fee is not necessarily going to cut it
    return bnOrZero(outboundFeeInAssetCryptoBaseUnit).times(1.05).toFixed(0)
  }, [outboundFeeInAssetCryptoBaseUnit])

  const _validateCryptoAmount = useCallback(
    async (value: string) => {
      if (!accountId) return false
      if (!opportunityData) return false
      if (!safeOutboundFeeInAssetCryptoBaseUnit) return false

      try {
        const withdrawAmountCryptoPrecision = bnOrZero(value)
        const withdrawAmountCryptoBaseUnit = toBaseUnit(value, asset.precision)
        const amountCryptoBaseUnit = toBaseUnit(withdrawAmountCryptoPrecision, asset.precision)

        if (withdrawAmountCryptoPrecision.gt(amountAvailableCryptoPrecision))
          return 'common.insufficientFunds'

        setMissingFunds(null)
        setQuoteLoading(true)

        const thorchainSaversWithdrawQuoteQueryKey: GetThorchainSaversWithdrawQuoteQueryKey = [
          'thorchainSaversWithdrawQuote',
          { asset, accountId, amountCryptoBaseUnit },
        ]

        let slippage_bps = await (async () => {
          // @TODO: verify if runepool doesn't occur any slippage
          if (isRunePool) return 0

          const maybeQuote: Result<ThorchainSaversWithdrawQuoteResponseSuccess, string> =
            await queryClient
              .fetchQuery({
                queryKey: thorchainSaversWithdrawQuoteQueryKey,
                queryFn: () =>
                  fetchThorchainWithdrawQuote({ asset, accountId, amountCryptoBaseUnit }),
                staleTime: 5000,
              })
              // Re-wrapping into a Result<T, E> since react-query expects promises to reject and doesn't speak monads
              .then(res => Ok(res))
              .catch((err: Error) => Err(err.message))

          const quote = maybeQuote.unwrap()

          return quote.fees.slippage_bps
        })()

        const percentage = bnOrZero(slippage_bps).div(BASE_BPS_POINTS).times(100)
        // total downside (slippage going into position) - 0.007 ETH for 5 ETH deposit
        const cryptoSlippageAmountPrecision = withdrawAmountCryptoPrecision
          .times(percentage)
          .div(100)
        setSlippageCryptoAmountPrecision(cryptoSlippageAmountPrecision.toString())

        const balanceCryptoPrecision = bnOrZero(amountAvailableCryptoPrecision.toPrecision())

        const hasValidBalance = await (async () => {
          // Only check for sweep + fees at this stage for UTXOs because of reconciliation - this is *not* required for EVM chains
          if (!isUtxoChainId(chainId)) {
            return (
              balanceCryptoPrecision.gt(0) &&
              withdrawAmountCryptoPrecision.gt(0) &&
              balanceCryptoPrecision.gte(withdrawAmountCryptoPrecision)
            )
          }

          const { hasEnoughBalance: hasEnoughBalanceForTxPlusFeesPlusSweep, missingFunds } =
            await fetchHasEnoughBalanceForTxPlusFeesPlusSweep({
              amountCryptoPrecision: withdrawAmountCryptoPrecision.toFixed(),
              accountId,
              asset,
              type: 'withdraw',
              fromAddress,
            })

          if (bnOrZero(missingFunds).gt(0)) setMissingFunds(missingFunds!.toFixed())

          return (
            balanceCryptoPrecision.gt(0) &&
            withdrawAmountCryptoPrecision.gt(0) &&
            hasEnoughBalanceForTxPlusFeesPlusSweep
          )
        })()

        const isBelowWithdrawThreshold = bn(withdrawAmountCryptoBaseUnit)
          .minus(safeOutboundFeeInAssetCryptoBaseUnit)
          .lt(0)

        if (isBelowWithdrawThreshold) {
          const minLimitCryptoPrecision = fromBaseUnit(
            safeOutboundFeeInAssetCryptoBaseUnit,
            asset.precision,
          )
          const minLimit = `${minLimitCryptoPrecision} ${asset.symbol}`
          return translate('trade.errors.amountTooSmall', {
            minLimit,
          })
        }

        if (withdrawAmountCryptoPrecision.isEqualTo(0)) return ''
        return hasValidBalance || 'common.insufficientFunds'
      } catch (e) {
        console.error(e)
      } finally {
        setQuoteLoading(false)
      }
    },
    [
      accountId,
      amountAvailableCryptoPrecision,
      asset,
      chainId,
      fromAddress,
      opportunityData,
      queryClient,
      safeOutboundFeeInAssetCryptoBaseUnit,
      translate,
      isRunePool,
    ],
  )

  const validateCryptoAmount = useCallback(
    (value: string) => {
      if (!dispatch) return

      dispatch({ type: ThorchainSaversWithdrawActionType.SET_LOADING, payload: true })
      return _validateCryptoAmount(value).finally(() => {
        dispatch({ type: ThorchainSaversWithdrawActionType.SET_LOADING, payload: false })
      })
    },
    [_validateCryptoAmount, dispatch],
  )

  const validateCryptoAmountDebounced = useMemo(
    () => pDebounce(validateCryptoAmount, 500),
    [validateCryptoAmount],
  )

  const missingFundsForGasTranslation: TextPropTypes['translation'] = useMemo(
    () => [
      'modals.confirm.missingFundsForGas',
      {
        cryptoAmountHuman: bn(missingFunds ?? 0).toFixed(6, BigNumber.ROUND_UP),
        assetSymbol: feeAsset.symbol,
      },
    ],
    [missingFunds, feeAsset.symbol],
  )

  const _validateFiatAmount = useCallback(
    async (value: string) => {
      if (!(opportunityData && accountId && dispatch)) return false

      setMissingFunds(null)
      setQuoteLoading(true)
      const withdrawAmountCryptoPrecision = bnOrZero(value).div(assetMarketData.price)
      try {
        const amountAvailableCryptoPrecisionBn = bnOrZero(
          amountAvailableCryptoPrecision.toPrecision(),
        )

        const amountAvailableFiat = amountAvailableCryptoPrecisionBn.times(assetMarketData.price)
        const valueCryptoPrecision = bnOrZero(value)

        const hasValidStakingBalance =
          amountAvailableFiat.gt(0) && valueCryptoPrecision.gt(0) && amountAvailableFiat.gte(value)

        const hasValidBalanceForTxPlusFees = await (async () => {
          if (!hasValidStakingBalance) return false
          // Only check for sweep + fees at this stage for UTXOs because of reconciliation - this is *not* required for EVM chains
          if (!isUtxoChainId(chainId)) return true
          const { hasEnoughBalance: hasEnoughBalanceForTxPlusFeesPlusSweep, missingFunds } =
            await fetchHasEnoughBalanceForTxPlusFeesPlusSweep({
              amountCryptoPrecision: withdrawAmountCryptoPrecision.toFixed(),
              accountId,
              asset,
              type: 'withdraw',
              fromAddress,
            })

          if (bnOrZero(missingFunds).gt(0)) setMissingFunds(missingFunds!.toFixed())

          return (
            amountAvailableFiat.gt(0) &&
            valueCryptoPrecision.gt(0) &&
            amountAvailableFiat.gte(value) &&
            hasEnoughBalanceForTxPlusFeesPlusSweep
          )
        })()

        if (valueCryptoPrecision.isEqualTo(0)) return ''
        return hasValidBalanceForTxPlusFees || 'common.insufficientFunds'
      } catch (e) {
        return translate('trade.errors.amountTooSmallUnknownMinimum')
      } finally {
        setQuoteLoading(false)
      }
    },
    [
      accountId,
      amountAvailableCryptoPrecision,
      asset,
      assetMarketData.price,
      chainId,
      dispatch,
      fromAddress,
      opportunityData,
      translate,
    ],
  )

  const validateFiatAmount = useCallback(
    (value: string) => {
      if (!dispatch) return

      dispatch({ type: ThorchainSaversWithdrawActionType.SET_LOADING, payload: true })
      return _validateFiatAmount(value).finally(() => {
        dispatch({ type: ThorchainSaversWithdrawActionType.SET_LOADING, payload: false })
      })
    },
    [_validateFiatAmount, dispatch],
  )

  const validateFiatAmountDebounced = useMemo(
    () => pDebounce(validateFiatAmount, 500),
    [validateFiatAmount],
  )

  const cryptoInputValidation = useMemo(
    () => ({
      required: true,
      validate: { validateCryptoAmountDebounced },
    }),
    [validateCryptoAmountDebounced],
  )

  const fiatInputValidation = useMemo(
    () => ({
      required: true,
      validate: { validateFiatAmountDebounced },
    }),
    [validateFiatAmountDebounced],
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
        marketData={assetMarketData}
        onCancel={handleCancel}
        onContinue={handleContinue}
        isLoading={
          isEstimatedFeesDataLoading ||
          isSweepNeededLoading ||
          isThorchainSaversWithdrawQuoteLoading ||
          state.loading
        }
        percentOptions={percentOptions}
        enableSlippage={false}
        handlePercentClick={handlePercentClick}
      >
        {!isRunePool ? (
          <Row>
            <Row.Label>{translate('common.slippage')}</Row.Label>
            <Row.Value>
              <Skeleton isLoaded={!quoteLoading}>
                <Amount.Crypto value={slippageCryptoAmountPrecision} symbol={asset.symbol} />
              </Skeleton>
            </Row.Value>
          </Row>
        ) : null}
        {bnOrZero(missingFunds).gt(0) && (
          <Alert status='error' borderRadius='lg'>
            <AlertIcon />
            <Text translation={missingFundsForGasTranslation} />
          </Alert>
        )}
      </ReusableWithdraw>
    </FormProvider>
  )
}
