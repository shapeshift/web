import type { ChainId } from '@keepkey/caip'
import { CHAIN_NAMESPACE, fromAccountId, fromAssetId } from '@keepkey/caip'
import type {
  EvmBaseAdapter,
  EvmChainId,
  FeeDataEstimate,
  UtxoBaseAdapter,
  UtxoChainId,
} from '@keepkey/chain-adapters'
import { debounce } from 'lodash'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import type { EstimateFeesInput } from 'components/Modals/Send/utils'
import { estimateFees } from 'components/Modals/Send/utils'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { tokenOrUndefined } from 'lib/utils'
import {
  selectFeeAssetById,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByFilter,
  selectPortfolioCryptoHumanBalanceByFilter,
  selectPortfolioFiatBalanceByFilter,
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
  estimateFees: (input: EstimateFeesInput) => Promise<FeeDataEstimate<ChainId>>
}

const moduleLogger = logger.child({
  namespace: ['Modals', 'Send', 'Hooks', 'useSendDetails'],
})

// TODO(0xdef1cafe): this whole thing needs to be refactored to be account focused, not asset focused
// i.e. you don't send from an asset, you send from an account containing an asset
export const useSendDetails = (): UseSendDetailsReturnType => {
  const [fieldName, setFieldName] = useState<AmountFieldName>(SendFormFields.CryptoAmount)
  const [loading, setLoading] = useState<boolean>(false)
  const history = useHistory()
  const { getValues, setValue } = useFormContext<SendInput>()
  const asset = useWatch<SendInput, SendFormFields.Asset>({
    name: SendFormFields.Asset,
  })
  const address = useWatch<SendInput, SendFormFields.Address>({
    name: SendFormFields.Address,
  })
  const accountId = useWatch<SendInput, SendFormFields.AccountId>({
    name: SendFormFields.AccountId,
  })

  const { assetId } = asset
  const price = bnOrZero(useAppSelector(state => selectMarketDataById(state, asset.assetId)).price)

  const feeAsset = useAppSelector(state => selectFeeAssetById(state, asset.assetId))
  const balancesLoading = false

  const cryptoHumanBalance = bnOrZero(
    useAppSelector(state =>
      selectPortfolioCryptoHumanBalanceByFilter(state, {
        assetId,
        accountId,
      }),
    ),
  )

  const fiatBalance = bnOrZero(
    useAppSelector(state => selectPortfolioFiatBalanceByFilter(state, { assetId, accountId })),
  )

  const assetBalance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, { assetId, accountId }),
  )

  const nativeAssetBalance = bnOrZero(
    useAppSelector(state =>
      selectPortfolioCryptoBalanceByFilter(state, {
        assetId: feeAsset.assetId,
        accountId,
      }),
    ),
  )

  const chainAdapterManager = getChainAdapterManager()
  const {
    state: { wallet },
  } = useWallet()

  const { assetReference } = fromAssetId(assetId)
  const contractAddress = tokenOrUndefined(assetReference)

  const estimateFormFees = useCallback(async (): Promise<FeeDataEstimate<ChainId>> => {
    const { cryptoAmount, asset, address, sendMax, accountId } = getValues()
    if (!wallet) throw new Error('No wallet connected')
    return estimateFees({ cryptoAmount, asset, address, sendMax, accountId, contractAddress })
  }, [contractAddress, getValues, wallet])

  const debouncedSetEstimatedFormFees = useMemo(() => {
    return debounce(
      async () => {
        const estimatedFees = await estimateFormFees()

        const { cryptoAmount } = getValues()
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
        if (feeAsset.assetId === asset.assetId) {
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
    asset.assetId,
    asset.precision,
    cryptoHumanBalance,
    estimateFormFees,
    feeAsset.assetId,
    feeAsset.symbol,
    getValues,
    nativeAssetBalance,
    setValue,
  ])

  // Stop calls to debouncedSetEstimatedFormFees on unmount
  useEffect(() => {
    return () => {
      debouncedSetEstimatedFormFees.cancel()
    }
  }, [debouncedSetEstimatedFormFees])

  const handleNextClick = async () => {
    history.push(SendRoutes.Confirm)
  }

  const handleSendMax = async () => {
    const fnLogger = moduleLogger.child({ namespace: ['handleSendMax'] })
    fnLogger.trace(
      { asset: asset.assetId, feeAsset: feeAsset.assetId, cryptoHumanBalance, fiatBalance },
      'Send Max',
    )
    // Clear existing amount errors.
    setValue(SendFormFields.AmountFieldError, '')

    if (feeAsset.assetId !== asset.assetId) {
      setValue(SendFormFields.CryptoAmount, cryptoHumanBalance.toPrecision())
      setValue(SendFormFields.FiatAmount, fiatBalance.toFixed(2))
      setLoading(true)

      try {
        fnLogger.trace('Estimating Fees...')
        const estimatedFees = await estimateFormFees()

        if (nativeAssetBalance.minus(estimatedFees.fast.txFee).isNegative()) {
          setValue(SendFormFields.AmountFieldError, [
            'modals.send.errors.notEnoughNativeToken',
            { asset: feeAsset.symbol },
          ])
        } else {
          setValue(SendFormFields.EstimatedFees, estimatedFees)
        }

        fnLogger.trace({ estimatedFees }, 'Estimated Fees')
        setLoading(false)
        return
      } catch (e) {
        fnLogger.error(e, 'Get Estimated Fees Failed')
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
              const adapterFees = await adapter.getFeeData({})
              const fastFee = adapterFees.fast.txFee
              return { adapterFees, fastFee }
            }
            case CHAIN_NAMESPACE.Evm: {
              const evmAdapter = adapter as unknown as EvmBaseAdapter<EvmChainId>
              const adapterFees = await evmAdapter.getFeeData({
                to,
                value: assetBalance,
                chainSpecific: { contractAddress, from: account },
                sendMax: true,
              })
              const fastFee = adapterFees.fast.txFee
              return { adapterFees, fastFee }
            }
            case CHAIN_NAMESPACE.Utxo: {
              const utxoAdapter = adapter as unknown as UtxoBaseAdapter<UtxoChainId>
              const adapterFees = await utxoAdapter.getFeeData({
                to,
                value: assetBalance,
                chainSpecific: { pubkey: account },
                sendMax: true,
              })
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
        fnLogger.trace({ fastFee, adapterFees }, 'Adapter Fees')

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

        fnLogger.trace(
          { networkFee, maxCrypto, maxFiat, hasEnoughNativeTokenForGas, nativeAssetBalance },
          'Getting Fees Completed',
        )
        setLoading(false)
      } catch (e) {
        fnLogger.error(e, 'Unexpected Error')
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

      const key =
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
          setValue(key, '') // TODO: this shouldn't be a thing, using a single amount field
          return
        }

        const amount =
          fieldName === SendFormFields.FiatAmount
            ? bnOrZero(bn(inputValue).div(price)).toString()
            : bnOrZero(bn(inputValue).times(price)).toString()

        setValue(key, amount)

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
    fiatBalance,
    handleNextClick,
    handleSendMax,
    handleInputChange,
    loading,
    toggleCurrency,
    estimateFees,
  }
}
