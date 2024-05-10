import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type {
  CosmosSdkChainId,
  EvmChainId,
  FeeDataEstimate,
  GetFeeDataInput,
  UtxoChainId,
} from '@shapeshiftoss/chain-adapters'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import { estimateFees } from 'components/Modals/Send/utils'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useDebounce } from 'hooks/useDebounce/useDebounce'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { tokenOrUndefined } from 'lib/utils'
import { assertGetCosmosSdkChainAdapter } from 'lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'
import { assertGetUtxoChainAdapter } from 'lib/utils/utxo'
import {
  selectAssetById,
  selectFeeAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectPortfolioUserCurrencyBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { SendInput } from '../../Form'
import { SendFormFields, SendRoutes } from '../../SendCommon'

type AmountFieldName = SendFormFields.FiatAmount | SendFormFields.AmountCryptoPrecision

type UseSendDetailsReturnType = {
  balancesLoading: boolean
  fieldName: AmountFieldName
  handleInputChange(inputValue: string): void
  handleNextClick(): void
  handleSendMax(): Promise<void>
  isLoading: boolean
  toggleCurrency(): void
  cryptoHumanBalance: BigNumber
  fiatBalance: BigNumber
}

// TODO(0xdef1cafe): this whole thing needs to be refactored to be account focused, not asset focused
// i.e. you don't send from an asset, you send from an account containing an asset
export const useSendDetails = (): UseSendDetailsReturnType => {
  const [fieldName, setFieldName] = useState<AmountFieldName>(SendFormFields.AmountCryptoPrecision)
  const [isFormLoading, setIsFormLoading] = useState<boolean>(false)
  const history = useHistory()
  const { setValue } = useFormContext<SendInput>()
  const assetId = useWatch<SendInput, SendFormFields.AssetId>({
    name: SendFormFields.AssetId,
  })
  const amountCryptoPrecision = useWatch<SendInput, SendFormFields.AmountCryptoPrecision>({
    name: SendFormFields.AmountCryptoPrecision,
  })
  const address = useWatch<SendInput, SendFormFields.To>({
    name: SendFormFields.To,
  })
  const accountId = useWatch<SendInput, SendFormFields.AccountId>({
    name: SendFormFields.AccountId,
  })

  const to = useWatch<SendInput, SendFormFields.To>({
    name: SendFormFields.To,
  })

  const sendMax = useWatch<SendInput, SendFormFields.SendMax>({
    name: SendFormFields.SendMax,
  })

  const price = bnOrZero(
    useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId)).price,
  )

  const chainAdapterManager = getChainAdapterManager()
  const feeAssetId = chainAdapterManager.get(fromAssetId(assetId).chainId)?.getFeeAssetId()
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, feeAssetId ?? ''))
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${assetId}`)

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const balancesLoading = false

  const cryptoHumanBalance = bnOrZero(
    useAppSelector(state =>
      selectPortfolioCryptoPrecisionBalanceByFilter(state, {
        assetId,
        accountId,
      }),
    ),
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
        assetId: feeAsset.assetId,
        accountId,
      }),
    ),
  )

  const {
    state: { wallet },
  } = useWallet()

  const { assetReference } = fromAssetId(assetId)
  const contractAddress = tokenOrUndefined(assetReference)

  const estimateFormFees = useCallback(
    ({
      amountCryptoPrecision,
    }: {
      amountCryptoPrecision: string
    }): Promise<FeeDataEstimate<ChainId>> => {
      if (!asset) throw new Error('No asset found')

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
    [accountId, asset, assetId, contractAddress, sendMax, to, wallet],
  )

  // * Determines the form's state from debounced input
  // * Valid inputs:
  // * - Non-empty numeric values including zero
  // * Error states:
  // * - Insufficient funds - give > have
  // * - Empty amount - input = ''
  // * - Not enough native token - gas > have
  const setEstimatedFormFeesQueryFn = useCallback(
    async ({ queryKey }: { queryKey: [string, { amountCryptoPrecision: string }] }) => {
      const [, { amountCryptoPrecision }] = queryKey

      if (amountCryptoPrecision === '') return null
      if (!asset || !accountId) return null

      const hasValidBalance = cryptoHumanBalance.gte(amountCryptoPrecision)

      try {
        if (!hasValidBalance) {
          throw new Error('common.insufficientFunds')
        }

        // No point to estimate fees if it is guaranteed to fail due to insufficient balance
        const estimatedFees = await estimateFormFees({ amountCryptoPrecision })

        if (estimatedFees === undefined) {
          throw new Error('common.generalError')
        }

        if (estimatedFees instanceof Error) {
          throw estimatedFees.message
        }

        // If sending native fee asset, ensure amount entered plus fees is less than balance.
        if (feeAsset.assetId === assetId) {
          const canCoverFees = nativeAssetBalance
            .minus(bnOrZero(amountCryptoPrecision).times(`1e+${asset.precision}`).decimalPlaces(0))
            .minus(estimatedFees.fast.txFee)
            .isPositive()
          if (!canCoverFees) {
            throw new Error('common.insufficientFunds')
          }
        } else if (nativeAssetBalance.minus(estimatedFees.fast.txFee).isNegative()) {
          setValue(SendFormFields.AmountFieldError, [
            'modals.send.errors.notEnoughNativeToken',
            { asset: feeAsset.symbol },
          ])
        }

        const hasEnoughNativeTokenForGas = nativeAssetBalance
          .minus(estimatedFees.fast.txFee)
          .isPositive()

        if (!hasEnoughNativeTokenForGas) {
          // We can't throw in an error here because an array is an invalid error message
          setValue(SendFormFields.AmountFieldError, [
            'modals.send.errors.notEnoughNativeToken',
            { asset: feeAsset.symbol },
          ])
          return null
        }

        // Remove existing error messages because the send amount is valid
        if (estimatedFees !== undefined) {
          setValue(SendFormFields.AmountFieldError, '')
          setValue(SendFormFields.EstimatedFees, estimatedFees)
        }

        return estimatedFees
      } catch (e) {
        throw new Error('common.insufficientFunds')
      }
    },
    // setValue is unstable and will cause re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      accountId,
      asset,
      assetId,
      cryptoHumanBalance,
      estimateFormFees,
      feeAsset.assetId,
      feeAsset.symbol,
      nativeAssetBalance,
    ],
  )

  const queryKey = useDebounce(
    () => ['setEstimatedFormFees', { amountCryptoPrecision }],
    1000,
  ) as unknown as [string, { amountCryptoPrecision: string }]

  const {
    isLoading: _isLoading,
    data,
    error,
  } = useQuery({
    queryKey,
    queryFn: setEstimatedFormFeesQueryFn,
    enabled: true,
    // a very arbitrary 15 seconds, which is enough to cache things in case the user is having fun with the input,
    // but also safe to invalidate in case there's a new Tx changing their balance
    staleTime: 15 * 1000,
    // for debugging purposes only
    refetchOnWindowFocus: false,
    // Consider failed queries as fresh, not stale, and don't do the default retry of 3 for them, as failures *are* expected here with insufficient funds
    retry: false,
  })

  const isTransitioning = useMemo(
    () => queryKey[1].amountCryptoPrecision !== amountCryptoPrecision,
    [amountCryptoPrecision, queryKey],
  )

  // Since we are debouncing the query, the query fire is delayed by however long the debounce is
  // This would lead to delayed loading states visually, which look odd and would make users able to continue with a wrong state
  const isLoading = isTransitioning || _isLoading

  useEffect(() => {
    setValue(SendFormFields.AmountFieldError, error?.message ? error.message : '')
  }, [error, setValue])

  useEffect(() => {
    if (!data) return
    // sendMax sets its own fees
    if (sendMax) return

    setValue(SendFormFields.EstimatedFees, data)
  }, [data, sendMax, setValue])

  const handleNextClick = () => history.push(SendRoutes.Confirm)

  const handleSendMax = async () => {
    // send max does a bit more than the good ol' estimateFees, and has its own inner fees estimation logic
    // so we need a separate state var to track loading state
    // we should probably be able to reuse the query here too with a refetch, which would remove the need for this
    setIsFormLoading(true)
    // Clear existing amount errors.
    setValue(SendFormFields.AmountFieldError, '')

    if (feeAsset.assetId !== assetId) {
      setValue(SendFormFields.AmountCryptoPrecision, cryptoHumanBalance.toPrecision())
      setValue(SendFormFields.FiatAmount, userCurrencyBalance.toFixed(2))
    }

    if (assetBalance && wallet) {
      setValue(SendFormFields.SendMax, true)
      const to = address

      try {
        const { chainId, chainNamespace, account } = fromAccountId(accountId)

        const { fastFee, adapterFees } = await (async () => {
          switch (chainNamespace) {
            case CHAIN_NAMESPACE.CosmosSdk: {
              const adapter = assertGetCosmosSdkChainAdapter(chainId)
              const getFeeDataInput: Partial<GetFeeDataInput<CosmosSdkChainId>> = {}
              const adapterFees = await adapter.getFeeData(getFeeDataInput)
              const fastFee = adapterFees.fast.txFee
              return { adapterFees, fastFee }
            }
            case CHAIN_NAMESPACE.Evm: {
              const evmAdapter = assertGetEvmChainAdapter(chainId)
              const getFeeDataInput: GetFeeDataInput<EvmChainId> = {
                to,
                value: assetBalance,
                chainSpecific: { contractAddress, from: account },
                sendMax: true,
              }
              const adapterFees = await evmAdapter.getFeeData(getFeeDataInput)
              const fastFee = adapterFees.fast.txFee
              return { adapterFees, fastFee }
            }
            case CHAIN_NAMESPACE.Utxo: {
              const utxoAdapter = assertGetUtxoChainAdapter(chainId)
              const getFeeDataInput: GetFeeDataInput<UtxoChainId> = {
                to,
                value: assetBalance,
                chainSpecific: { pubkey: account },
                sendMax: true,
              }
              const adapterFees = await utxoAdapter.getFeeData(getFeeDataInput)
              const fastFee = adapterFees.fast.txFee
              return { adapterFees, fastFee }
            }
            default: {
              throw new Error(
                `useSendDetails(handleSendMax): no adapter available for chainId ${chainId}`,
              )
            }
          }
        })()

        setValue(SendFormFields.EstimatedFees, adapterFees)

        const networkFee = bnOrZero(bn(fastFee).div(`1e${feeAsset.precision}`))

        const maxCrypto = cryptoHumanBalance.minus(networkFee)
        const maxFiat = maxCrypto.times(price)

        const hasEnoughNativeTokenForGas = nativeAssetBalance
          .minus(adapterFees.fast.txFee)
          .isPositive()

        if (!hasEnoughNativeTokenForGas) {
          setValue(SendFormFields.AmountFieldError, [
            'modals.send.errors.notEnoughNativeToken',
            { asset: feeAsset.symbol },
          ])
        }

        setValue(SendFormFields.AmountCryptoPrecision, maxCrypto.toPrecision())
        setValue(SendFormFields.FiatAmount, maxFiat.toFixed(2))
      } catch (e) {
        console.error(e)
      } finally {
        setIsFormLoading(false)
      }
    }
  }

  /**
   * handleInputChange
   *
   * A simple input change handler - minimal validation, no error handling
   * Synchronize input values to state, to be debounced and used to run the setEstimatedFormFees values
   */
  const handleInputChange = useCallback(
    (inputValue: string) => {
      setIsFormLoading(true)
      setValue(SendFormFields.SendMax, false)

      const otherField =
        fieldName !== SendFormFields.FiatAmount
          ? SendFormFields.FiatAmount
          : SendFormFields.AmountCryptoPrecision

      if (inputValue === '') {
        setValue(SendFormFields.AmountFieldError, '')
        // Set value of the other input to an empty string as well
        setValue(otherField, '') // TODO: this shouldn't be a thing, using a single amount field
      }

      const cryptoAmount =
        fieldName === SendFormFields.FiatAmount ? bn(inputValue).div(price) : inputValue
      const fiatAmount =
        fieldName === SendFormFields.FiatAmount ? inputValue : bn(inputValue).times(price)
      const otherAmount =
        fieldName === SendFormFields.FiatAmount ? cryptoAmount.toString() : fiatAmount.toString()

      setValue(otherField, otherAmount)
      setIsFormLoading(false)
    },
    [fieldName, price, setValue],
  )

  const toggleCurrency = () => {
    setFieldName(
      fieldName === SendFormFields.FiatAmount
        ? SendFormFields.AmountCryptoPrecision
        : SendFormFields.FiatAmount,
    )
  }

  return {
    balancesLoading,
    fieldName,
    cryptoHumanBalance,
    fiatBalance: userCurrencyBalance,
    handleNextClick,
    handleSendMax,
    handleInputChange,
    isLoading: isFormLoading || isLoading,
    toggleCurrency,
  }
}
