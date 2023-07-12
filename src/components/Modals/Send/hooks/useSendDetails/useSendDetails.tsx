import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type {
  CosmosSdkChainId,
  EvmBaseAdapter,
  EvmChainId,
  FeeDataEstimate,
  GetFeeDataInput,
  UtxoBaseAdapter,
  UtxoChainId,
} from '@shapeshiftoss/chain-adapters'
import { debounce } from 'lodash'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import { estimateFees } from 'components/Modals/Send/utils'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { tokenOrUndefined } from 'lib/utils'
import {
  selectAssetById,
  selectFeeAssetById,
  selectMarketDataById,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectPortfolioUserCurrencyBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { SendInput } from '../../Form'
import { SendFormFields, SendRoutes } from '../../SendCommon'

type AmountFieldName = SendFormFields.FiatAmount | SendFormFields.CryptoAmount

type UseSendDetailsReturnType = {
  balancesLoading: boolean
  fieldName: AmountFieldName
  handleInputChange(inputValue: string): Promise<void>
  handleNextClick(): void
  handleSendMax(): Promise<void>
  loading: boolean
  toggleCurrency(): void
  cryptoHumanBalance: BigNumber
  fiatBalance: BigNumber
}

// TODO(0xdef1cafe): this whole thing needs to be refactored to be account focused, not asset focused
// i.e. you don't send from an asset, you send from an account containing an asset
export const useSendDetails = (): UseSendDetailsReturnType => {
  const [fieldName, setFieldName] = useState<AmountFieldName>(SendFormFields.CryptoAmount)
  const [loading, setLoading] = useState<boolean>(false)
  const history = useHistory()
  const { getValues, setValue } = useFormContext<SendInput>()
  const assetId = useWatch<SendInput, SendFormFields.AssetId>({
    name: SendFormFields.AssetId,
  })
  const address = useWatch<SendInput, SendFormFields.To>({
    name: SendFormFields.To,
  })
  const accountId = useWatch<SendInput, SendFormFields.AccountId>({
    name: SendFormFields.AccountId,
  })

  const price = bnOrZero(useAppSelector(state => selectMarketDataById(state, assetId)).price)

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

  const estimateFormFees = useCallback((): Promise<FeeDataEstimate<ChainId>> => {
    if (!asset) throw new Error('No asset found')

    const { assetId, cryptoAmount, to, sendMax } = getValues()
    if (!wallet) throw new Error('No wallet connected')
    return estimateFees({ cryptoAmount, assetId, to, sendMax, accountId, contractAddress })
  }, [accountId, asset, contractAddress, getValues, wallet])

  const debouncedSetEstimatedFormFees = useMemo(() => {
    return debounce(
      async () => {
        const { cryptoAmount } = getValues()
        if (cryptoAmount === '') return
        if (!asset || !accountId) return
        const estimatedFees = await estimateFormFees()

        const hasValidBalance = cryptoHumanBalance.gte(cryptoAmount)

        if (!hasValidBalance) {
          throw new Error('common.insufficientFunds')
        }

        if (estimatedFees === undefined) {
          throw new Error('common.generalError')
        }

        if (estimatedFees instanceof Error) {
          throw estimatedFees.message
        }

        // If sending native fee asset, ensure amount entered plus fees is less than balance.
        if (feeAsset.assetId === assetId) {
          const canCoverFees = nativeAssetBalance
            .minus(bnOrZero(cryptoAmount).times(`1e+${asset.precision}`).decimalPlaces(0))
            .minus(estimatedFees.fast.txFee)
            .isPositive()
          if (!canCoverFees) {
            throw new Error('common.insufficientFunds')
          }
        }

        const hasEnoughNativeTokenForGas = nativeAssetBalance
          .minus(estimatedFees.fast.txFee)
          .isPositive()

        if (!hasEnoughNativeTokenForGas) {
          setValue(SendFormFields.AmountFieldError, [
            'modals.send.errors.notEnoughNativeToken',
            { asset: feeAsset.symbol },
          ])
          setLoading(false)
          return
        }

        // Remove existing error messages because the send amount is valid
        if (estimatedFees !== undefined) {
          setValue(SendFormFields.AmountFieldError, '')
          setValue(SendFormFields.EstimatedFees, estimatedFees)
        }
      },
      1000,
      { leading: true, trailing: true },
    )
  }, [
    accountId,
    asset,
    assetId,
    cryptoHumanBalance,
    estimateFormFees,
    feeAsset.assetId,
    feeAsset.symbol,
    getValues,
    nativeAssetBalance,
    setValue,
  ])

  // Stop calls to debouncedSetEstimatedFormFees on unmount
  useEffect(() => () => debouncedSetEstimatedFormFees.cancel(), [debouncedSetEstimatedFormFees])

  const handleNextClick = () => history.push(SendRoutes.Confirm)

  const handleSendMax = async () => {
    // Clear existing amount errors.
    setValue(SendFormFields.AmountFieldError, '')

    if (feeAsset.assetId !== assetId) {
      setValue(SendFormFields.CryptoAmount, cryptoHumanBalance.toPrecision())
      setValue(SendFormFields.FiatAmount, userCurrencyBalance.toFixed(2))
      setLoading(true)

      try {
        const estimatedFees = await estimateFormFees()

        if (nativeAssetBalance.minus(estimatedFees.fast.txFee).isNegative()) {
          setValue(SendFormFields.AmountFieldError, [
            'modals.send.errors.notEnoughNativeToken',
            { asset: feeAsset.symbol },
          ])
        } else {
          setValue(SendFormFields.EstimatedFees, estimatedFees)
        }

        setLoading(false)
        return
      } catch (e) {
        console.error(e)
      }
    }

    if (assetBalance && wallet) {
      setValue(SendFormFields.SendMax, true)
      setLoading(true)
      const to = address

      try {
        const { chainId, chainNamespace, account } = fromAccountId(accountId)
        const adapter = chainAdapterManager.get(chainId)
        if (!adapter) throw new Error(`No adapter available for ${chainId}`)

        const { fastFee, adapterFees } = await (async () => {
          switch (chainNamespace) {
            case CHAIN_NAMESPACE.CosmosSdk: {
              const getFeeDataInput: Partial<GetFeeDataInput<CosmosSdkChainId>> = {}
              const adapterFees = await adapter.getFeeData(getFeeDataInput)
              const fastFee = adapterFees.fast.txFee
              return { adapterFees, fastFee }
            }
            case CHAIN_NAMESPACE.Evm: {
              const evmAdapter = adapter as unknown as EvmBaseAdapter<EvmChainId>
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
              const utxoAdapter = adapter as unknown as UtxoBaseAdapter<UtxoChainId>
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

        setValue(SendFormFields.CryptoAmount, maxCrypto.toPrecision())
        setValue(SendFormFields.FiatAmount, maxFiat.toFixed(2))
        setLoading(false)
      } catch (e) {
        console.error(e)
      }
    }
  }

  /**
   * handleInputChange
   *
   * Determines the form's state from input by onChange event.
   * Valid inputs:
   * - Non-empty numeric values including zero
   * Error states:
   * - Insufficient funds - give > have
   * - Empty amount - input = ''
   * - Not enough native token - gas > have
   */
  const handleInputChange = useCallback(
    async (inputValue: string) => {
      setValue(SendFormFields.SendMax, false)

      const otherField =
        fieldName !== SendFormFields.FiatAmount
          ? SendFormFields.FiatAmount
          : SendFormFields.CryptoAmount

      try {
        if (inputValue === '') {
          // Cancel any pending requests
          debouncedSetEstimatedFormFees.cancel()
          // Don't show an error message when the input is empty
          setValue(SendFormFields.AmountFieldError, '')
          // Set value of the other input to an empty string as well
          setValue(otherField, '') // TODO: this shouldn't be a thing, using a single amount field
          return
        }

        const amount =
          fieldName === SendFormFields.FiatAmount
            ? bnOrZero(bn(inputValue).div(price)).toString()
            : bnOrZero(bn(inputValue).times(price)).toString()

        setValue(otherField, amount)

        // TODO: work toward a consistent way of handling tx fees and minimum amounts
        // see, https://github.com/shapeshift/web/issues/1966

        await (async () => {
          try {
            setLoading(true)
            await debouncedSetEstimatedFormFees()
          } catch (e) {
            throw new Error('common.insufficientFunds')
          } finally {
            setLoading(false)
          }
        })()
      } catch (e) {
        if (e instanceof Error) {
          setValue(SendFormFields.AmountFieldError, e.message)
        }
      } finally {
        setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accountId, estimateFormFees, feeAsset.symbol, fieldName, getValues, setValue],
  )

  const toggleCurrency = () => {
    setFieldName(
      fieldName === SendFormFields.FiatAmount
        ? SendFormFields.CryptoAmount
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
    loading,
    toggleCurrency,
  }
}
