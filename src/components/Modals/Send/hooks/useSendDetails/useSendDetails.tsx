import type { ChainId } from '@shapeshiftoss/caip'
import { solAssetId } from '@shapeshiftoss/caip'
import type { FeeDataEstimate } from '@shapeshiftoss/chain-adapters'
import { ChainAdapterError, solana } from '@shapeshiftoss/chain-adapters'
import { contractAddressOrUndefined } from '@shapeshiftoss/utils'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'

import type { SendInput } from '../../Form'
import { SendFormFields } from '../../SendCommon'

import { estimateFees } from '@/components/Modals/Send/utils'
import { useDebounce } from '@/hooks/useDebounce/useDebounce'
import { useWallet } from '@/hooks/useWallet/useWallet'
import type { BigNumber } from '@/lib/bignumber/bignumber'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from '@/lib/math'
import {
  selectAssetById,
  selectFeeAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectPortfolioUserCurrencyBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type AmountFieldName = SendFormFields.FiatAmount | SendFormFields.AmountCryptoPrecision

type UseSendDetailsReturnType = {
  balancesLoading: boolean
  fieldName: AmountFieldName
  handleInputChange(inputValue: string): void
  handleSendMax(): Promise<void>
  isLoading: boolean
  toggleIsFiat(): void
  cryptoHumanBalance: string
  fiatBalance: BigNumber
}

// TODO(0xdef1cafe): this whole thing needs to be refactored to be account focused, not asset focused
// i.e. you don't send from an asset, you send from an account containing an asset
export const useSendDetails = (): UseSendDetailsReturnType => {
  const translate = useTranslate()
  const [fieldName, setFieldName] = useState<AmountFieldName>(SendFormFields.AmountCryptoPrecision)
  const { control, setValue } = useFormContext<SendInput>()
  const { accountId, assetId, to, amountCryptoPrecision, fiatAmount, sendMax } = useWatch({
    control,
  }) as Partial<SendInput>

  const marketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId ?? ''),
  )

  const price = useMemo(() => marketDataUserCurrency?.price ?? 0, [marketDataUserCurrency])

  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId ?? ''))

  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))

  const balancesLoading = false

  const cryptoHumanBalance = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, {
      assetId,
      accountId,
    }),
  )

  const userCurrencyBalance = bnOrZero(
    useAppSelector(state =>
      selectPortfolioUserCurrencyBalanceByFilter(state, { assetId, accountId }),
    ),
  )

  const assetBalance = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, { assetId, accountId }),
  )

  const nativeAssetBalance = bnOrZero(
    useAppSelector(state =>
      selectPortfolioCryptoBalanceBaseUnitByFilter(state, {
        assetId: feeAsset?.assetId,
        accountId,
      }),
    ),
  )

  const {
    state: { wallet },
  } = useWallet()

  const contractAddress = useMemo(() => contractAddressOrUndefined(assetId ?? ''), [assetId])

  const estimateFormFees = useCallback(
    ({
      amountCryptoPrecision,
      sendMax,
    }: {
      amountCryptoPrecision: string
      sendMax: boolean
    }): Promise<FeeDataEstimate<ChainId>> => {
      if (!asset) throw new Error('No asset found')
      if (!assetId) throw new Error('No assetId found')
      if (!to) throw new Error('No destination address')
      if (!accountId) throw new Error('No accountId found')
      if (!wallet) throw new Error('No wallet connected')

      return estimateFees({
        amountCryptoPrecision,
        assetId,
        to,
        sendMax,
        accountId,
        contractAddress,
      })
    },
    [accountId, asset, assetId, contractAddress, to, wallet],
  )

  // * Determines the form's state from debounced input
  // * Valid inputs:
  // * - Non-empty numeric values including zero
  // * Error states:
  // * - Insufficient funds - give > have
  // * - Empty amount - input = ''
  // * - Not enough native token - gas > have
  const setEstimatedFormFeesQueryFn = useCallback(
    async ({
      queryKey,
    }: {
      queryKey: [string, { amountCryptoPrecision: string; sendMax: boolean }]
    }) => {
      const [, { sendMax, amountCryptoPrecision }] = queryKey

      if (bnOrZero(amountCryptoPrecision).lte(0)) return null
      if (!asset || !accountId) return null

      const hasValidBalance = bnOrZero(cryptoHumanBalance).gte(bnOrZero(amountCryptoPrecision))

      // No point to estimate fees if it is guaranteed to fail due to insufficient balance
      if (!hasValidBalance) {
        throw new Error('common.insufficientFunds')
      }

      try {
        const estimatedFees = await estimateFormFees({ amountCryptoPrecision, sendMax })

        if (estimatedFees === undefined) {
          throw new Error('common.generalError')
        }

        if (estimatedFees instanceof Error) {
          throw estimatedFees.message
        }

        const hasEnoughNativeTokenForGas = nativeAssetBalance.minus(estimatedFees.fast.txFee).gte(0)

        // The worst case scenario - user cannot ever cover the gas fees - regardless of whether this is a token send or not
        if (!hasEnoughNativeTokenForGas) {
          setValue(SendFormFields.AmountFieldError, [
            'modals.send.errors.notEnoughNativeToken',
            { asset: feeAsset?.symbol ?? '' },
          ])
          // Don't throw here - this is *not* an exception and we do want to consume the fees
          return estimatedFees
        }

        if (feeAsset?.assetId === assetId) {
          // A slightly better, but still sad scenario - user has enough balance, but may not have enough fee asset balance to cover fees
          const canCoverFees = nativeAssetBalance
            .minus(
              bn(toBaseUnit(sendMax ? 0 : amountCryptoPrecision, asset.precision)).decimalPlaces(0),
            )
            .minus(estimatedFees.fast.txFee)
            .minus(assetId === solAssetId ? solana.SOLANA_MINIMUM_RENT_EXEMPTION_LAMPORTS : 0)
            .gt(0)

          if (!canCoverFees) {
            setValue(SendFormFields.AmountFieldError, 'common.insufficientFunds')
            // Don't throw here - this is *not* an exception and we do want to consume the fees
            return estimatedFees
          }
        }

        // Remove existing error messages because the send amount is valid
        if (estimatedFees !== undefined) {
          setValue(SendFormFields.AmountFieldError, '')
          setValue(SendFormFields.EstimatedFees, estimatedFees)
        }

        return estimatedFees
      } catch (e: unknown) {
        console.debug(e)

        if (e instanceof ChainAdapterError) {
          throw new Error(translate(e.metadata.translation, e.metadata.options))
        }

        throw new Error((e as Error).message)
      }
    },
    [
      accountId,
      asset,
      assetId,
      cryptoHumanBalance,
      estimateFormFees,
      feeAsset?.assetId,
      feeAsset?.symbol,
      nativeAssetBalance,
      setValue,
      translate,
    ],
  )

  const debouncedAmountCryptoPrecision = useDebounce(amountCryptoPrecision, 1000)

  const queryKey = useMemo(
    () => [
      'setEstimatedFormFees',
      { amountCryptoPrecision: debouncedAmountCryptoPrecision, sendMax, to, accountId },
    ],
    [debouncedAmountCryptoPrecision, sendMax, to, accountId],
  ) as unknown as [string, { amountCryptoPrecision: string; sendMax: boolean; to: string }]

  // No debouncing here, since there is no user input
  const estimateSendMaxFormFeesQueryKey = useMemo(
    () => ['setEstimatedFormFees', { amountCryptoPrecision: cryptoHumanBalance, sendMax: true }],
    [cryptoHumanBalance],
  ) as unknown as [string, { amountCryptoPrecision: string; sendMax: boolean }]

  const hasEnteredPositiveAmount = useMemo(() => {
    if (amountCryptoPrecision === '' || fiatAmount === '') return false

    return bnOrZero(amountCryptoPrecision).plus(bnOrZero(fiatAmount)).isPositive()
  }, [amountCryptoPrecision, fiatAmount])

  const {
    isFetching: _isEstimatedFormFeesFetching,
    data: estimatedFees,
    error: estimatedFeesError,
  } = useQuery({
    queryKey,
    queryFn: setEstimatedFormFeesQueryFn,
    enabled: hasEnteredPositiveAmount,
    // a very arbitrary 15 seconds, which is enough to cache things in case the user is having fun with the input,
    // but also safe to invalidate in case there's a new Tx changing their balance
    staleTime: 15 * 1000,
    // Consider failed queries as fresh, not stale, and don't do the default retry of 3 for them, as failures *are* expected here with insufficient funds
    retry: false,
    // If the user get back and forth between the address and the amount form, we want to refetch the fees so it revalidate the form
    refetchOnMount: 'always',
    gcTime: 0,
    refetchIntervalInBackground: true,
    refetchInterval: 15_000,
  })

  const {
    isRefetching: isEstimatedSendMaxFeesRefetching,
    isLoading: isEstimatedSendMaxFeesLoading,
    refetch: refetchSendMaxFees,
    data: sendMaxFees,
    error: sendMaxFeesError,
  } = useQuery({
    queryKey: estimateSendMaxFormFeesQueryKey,
    queryFn: setEstimatedFormFeesQueryFn,
    staleTime: 15 * 1000,
    enabled: false,
    retry: false,
    refetchIntervalInBackground: true,
    refetchInterval: 15_000,
  })

  useEffect(() => {
    if (!(sendMaxFees && sendMax)) return

    const fastFee = sendMaxFees.fast.txFee

    const networkFee = fromBaseUnit(fastFee, feeAsset?.precision ?? 0)

    const maxCrypto =
      feeAsset?.assetId !== assetId
        ? bnOrZero(cryptoHumanBalance)
        : bnOrZero(cryptoHumanBalance)
            .minus(networkFee)
            .minus(
              assetId === solAssetId
                ? fromBaseUnit(
                    solana.SOLANA_MINIMUM_RENT_EXEMPTION_LAMPORTS,
                    feeAsset?.precision ?? 0,
                  )
                : 0,
            )
    const maxFiat = maxCrypto.times(bnOrZero(price))

    const maxCryptoOrZero = maxCrypto.isPositive() ? maxCrypto : bn(0)
    const maxFiatOrZero = maxFiat.isPositive() ? maxFiat : bn(0)

    setValue(SendFormFields.AmountCryptoPrecision, maxCryptoOrZero.toPrecision())
    setValue(SendFormFields.FiatAmount, maxFiatOrZero.toFixed(2))
  }, [
    assetId,
    feeAsset?.assetId,
    feeAsset?.precision,
    cryptoHumanBalance,
    price,
    sendMax,
    sendMaxFees,
    setValue,
    sendMaxFeesError,
  ])

  const isTransitioning = useMemo(
    () => !sendMax && queryKey[1].amountCryptoPrecision !== amountCryptoPrecision,
    [amountCryptoPrecision, queryKey, sendMax],
  )

  // Since we are debouncing the query, the query fire is delayed by however long the debounce is
  // This would lead to delayed loading states visually, which look odd and would make users able to continue with a wrong state
  const isEstimatedFormFeesLoading = useMemo(
    () =>
      isTransitioning ||
      isEstimatedSendMaxFeesLoading ||
      isEstimatedSendMaxFeesRefetching ||
      _isEstimatedFormFeesFetching,
    [
      isTransitioning,
      isEstimatedSendMaxFeesLoading,
      isEstimatedSendMaxFeesRefetching,
      _isEstimatedFormFeesFetching,
    ],
  )

  useEffect(() => {
    // Since we are debouncing the query, ensure reverting back to an empty input doesn't end up in the previous error being displayed
    if (!hasEnteredPositiveAmount) return setValue(SendFormFields.AmountFieldError, '')

    // openapi-generator error-handling https://github.com/OpenAPITools/openapi-generator/blob/8357cc313be5a099f994c4ffaf56146f40dba911/samples/client/petstore/typescript-fetch/builds/enum/runtime.ts#L221
    if (
      estimatedFeesError?.message ===
        'The request failed and the interceptors did not return an alternative response' ||
      estimatedFeesError?.message?.includes('body stream already read')
    )
      return setValue(SendFormFields.AmountFieldError, 'modals.send.getFeesError')

    if (estimatedFeesError?.message) {
      setValue(SendFormFields.AmountFieldError, estimatedFeesError.message)
    }
  }, [estimatedFeesError, hasEnteredPositiveAmount, setValue])

  useEffect(() => {
    if (!estimatedFees) return
    // sendMax sets its own fees
    if (sendMax) return

    setValue(SendFormFields.EstimatedFees, estimatedFees)
  }, [estimatedFees, sendMax, setValue])

  const handleSendMax = useCallback(async () => {
    setValue(SendFormFields.SendMax, true)
    // Clear existing amount errors.
    setValue(SendFormFields.AmountFieldError, '')

    if (!(assetBalance && wallet)) return

    // This is a token send - the max is the absolute max. balance for that asset and no further magic is needed for fees deduction
    if (feeAsset?.assetId !== assetId) {
      const maxCrypto = bnOrZero(cryptoHumanBalance)
      const maxFiat = maxCrypto.times(bnOrZero(price))

      setValue(SendFormFields.AmountCryptoPrecision, maxCrypto.toPrecision())
      setValue(SendFormFields.FiatAmount, maxFiat.toFixed(2))
    }
    // There is no balance, hence we don't need to estimate fees, but still need to set to zero out the form values
    else if (bnOrZero(cryptoHumanBalance).isZero()) {
      setValue(SendFormFields.AmountCryptoPrecision, '0')
      setValue(SendFormFields.FiatAmount, '0')
      return
    }

    // Whether this is a token send or not, refetch the sendMax fees
    await refetchSendMaxFees()
  }, [
    assetBalance,
    assetId,
    cryptoHumanBalance,
    feeAsset?.assetId,
    price,
    refetchSendMaxFees,
    setValue,
    wallet,
  ])

  /**
   * handleInputChange
   *
   * A simple input change handler - minimal validation, no error handling
   * Synchronize input values to state, to be debounced and used to run the setEstimatedFormFees values
   */
  const handleInputChange = useCallback(
    (inputValue: string) => {
      setValue(SendFormFields.AmountFieldError, '')

      // Always clear sendMax mode when user manually edits the amount
      setValue(SendFormFields.SendMax, false)

      const otherField =
        fieldName !== SendFormFields.FiatAmount
          ? SendFormFields.FiatAmount
          : SendFormFields.AmountCryptoPrecision

      if (inputValue === '') {
        // Set value of the other input to an empty string as well
        setValue(otherField, '') // TODO: this shouldn't be a thing, using a single amount field
        return
      }

      const cryptoAmount =
        fieldName === SendFormFields.FiatAmount ? bn(inputValue).div(bnOrZero(price)) : inputValue
      const fiatAmount =
        fieldName === SendFormFields.FiatAmount ? inputValue : bn(inputValue).times(bnOrZero(price))
      const otherAmount =
        fieldName === SendFormFields.FiatAmount ? cryptoAmount.toString() : fiatAmount.toString()

      setValue(otherField, otherAmount)
    },
    [fieldName, price, setValue],
  )

  const toggleIsFiat = useCallback(() => {
    setFieldName(
      fieldName === SendFormFields.FiatAmount
        ? SendFormFields.AmountCryptoPrecision
        : SendFormFields.FiatAmount,
    )
  }, [fieldName])

  return {
    balancesLoading,
    fieldName,
    cryptoHumanBalance,
    fiatBalance: userCurrencyBalance,
    handleSendMax,
    handleInputChange,
    isLoading: isEstimatedFormFeesLoading,
    toggleIsFiat,
  }
}
