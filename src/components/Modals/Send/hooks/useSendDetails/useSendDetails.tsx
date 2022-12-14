import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type {
  EvmBaseAdapter,
  EvmChainId,
  FeeDataEstimate,
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
import { logger } from 'lib/logger'
import { tokenOrUndefined } from 'lib/utils'
import {
  selectFeeAssetById,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByFilter,
  selectPortfolioFiatBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { SendInput } from '../../Form'
import { SendFormFields, SendRoutes } from '../../SendCommon'

type AmountFieldName = SendFormFields.FiatAmount | SendFormFields.CryptoAmountBaseUnit

type UseSendDetailsReturnType = {
  balancesLoading: boolean
  fieldName: AmountFieldName
  handleInputChange(inputValue: string): Promise<void>
  handleNextClick(): void
  handleSendMax(): Promise<void>
  loading: boolean
  toggleCurrency(): void
  cryptoBalanceBaseUnit: string
  fiatBalance: BigNumber
}

const moduleLogger = logger.child({
  namespace: ['Modals', 'Send', 'Hooks', 'useSendDetails'],
})

// TODO(0xdef1cafe): this whole thing needs to be refactored to be account focused, not asset focused
// i.e. you don't send from an asset, you send from an account containing an asset
export const useSendDetails = (): UseSendDetailsReturnType => {
  const [fieldName, setFieldName] = useState<AmountFieldName>(SendFormFields.CryptoAmountBaseUnit)
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

  const cryptoBalanceBaseUnit =
    useAppSelector(state =>
      selectPortfolioCryptoBalanceByFilter(state, {
        assetId,
        accountId,
      }),
    ) ?? '0'

  const fiatBalance = bnOrZero(
    useAppSelector(state => selectPortfolioFiatBalanceByFilter(state, { assetId, accountId })),
  )

  const assetBalance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, { assetId, accountId }),
  )

  const nativeAssetBalanceBaseUnit = bnOrZero(
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

  const estimateFormFees = useCallback((): Promise<FeeDataEstimate<ChainId>> => {
    const { cryptoAmountBaseUnit, asset, address, sendMax, accountId } = getValues()
    if (!wallet) throw new Error('No wallet connected')
    return estimateFees({
      cryptoAmountBaseUnit,
      asset,
      address,
      sendMax,
      accountId,
      contractAddress,
    })
  }, [contractAddress, getValues, wallet])

  const debouncedSetEstimatedFormFees = useMemo(() => {
    return debounce(
      async () => {
        const estimatedFeesCryptoBaseUnit = await estimateFormFees()

        const { cryptoAmountBaseUnit } = getValues()
        const hasValidBalance = bn(cryptoBalanceBaseUnit).gte(cryptoAmountBaseUnit)

        if (!hasValidBalance) {
          throw new Error('common.insufficientFunds')
        }

        if (estimatedFeesCryptoBaseUnit === undefined) {
          throw new Error('common.generalError')
        }

        if (estimatedFeesCryptoBaseUnit instanceof Error) {
          throw estimatedFeesCryptoBaseUnit.message
        }

        // If sending native fee asset, ensure amount entered plus fees is less than balance.
        if (feeAsset.assetId === asset.assetId) {
          const canCoverFees = nativeAssetBalanceBaseUnit
            .minus(cryptoAmountBaseUnit)
            .minus(estimatedFeesCryptoBaseUnit.fast.txFee)
            .isPositive()
          if (!canCoverFees) {
            throw new Error('common.insufficientFunds')
          }
        }

        const hasEnoughNativeTokenForGas = nativeAssetBalanceBaseUnit
          .minus(estimatedFeesCryptoBaseUnit.fast.txFee)
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
        if (estimatedFeesCryptoBaseUnit !== undefined) {
          setValue(SendFormFields.AmountFieldError, '')
          setValue(SendFormFields.EstimatedFeesCryptoBaseUnit, estimatedFeesCryptoBaseUnit)
        }
      },
      1000,
      { leading: true, trailing: true },
    )
  }, [
    asset.assetId,
    cryptoBalanceBaseUnit,
    estimateFormFees,
    feeAsset.assetId,
    feeAsset.symbol,
    getValues,
    nativeAssetBalanceBaseUnit,
    setValue,
  ])

  // Stop calls to debouncedSetEstimatedFormFees on unmount
  useEffect(() => () => debouncedSetEstimatedFormFees.cancel(), [debouncedSetEstimatedFormFees])

  const handleNextClick = () => history.push(SendRoutes.Confirm)

  const handleSendMax = async () => {
    const fnLogger = moduleLogger.child({ namespace: ['handleSendMax'] })
    fnLogger.trace(
      {
        asset: asset.assetId,
        feeAsset: feeAsset.assetId,
        cryptoBalanceBaseUnit,
        fiatBalance,
      },
      'Send Max',
    )
    // Clear existing amount errors.
    setValue(SendFormFields.AmountFieldError, '')

    if (feeAsset.assetId !== asset.assetId) {
      setValue(SendFormFields.CryptoAmountBaseUnit, cryptoBalanceBaseUnit)
      setValue(SendFormFields.FiatAmount, fiatBalance.toFixed(2))
      setLoading(true)

      try {
        fnLogger.trace('Estimating Fees...')
        const estimatedFeesCryptoBaseUnit = await estimateFormFees()

        if (nativeAssetBalanceBaseUnit.minus(estimatedFeesCryptoBaseUnit.fast.txFee).isNegative()) {
          setValue(SendFormFields.AmountFieldError, [
            'modals.send.errors.notEnoughNativeToken',
            { asset: feeAsset.symbol },
          ])
        } else {
          setValue(SendFormFields.EstimatedFeesCryptoBaseUnit, estimatedFeesCryptoBaseUnit)
        }

        fnLogger.trace({ estimatedFees: estimatedFeesCryptoBaseUnit }, 'Estimated Fees')
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

        setValue(SendFormFields.EstimatedFeesCryptoBaseUnit, adapterFees)

        const networkFeeCryptoBaseUnit = fastFee

        const maxCryptoBaseUnit = bn(cryptoBalanceBaseUnit).minus(networkFeeCryptoBaseUnit)
        const maxFiat = maxCryptoBaseUnit.div(bn(10).pow(asset.precision)).times(price)

        const hasEnoughNativeTokenForGas = nativeAssetBalanceBaseUnit
          .minus(adapterFees.fast.txFee)
          .isPositive()

        if (!hasEnoughNativeTokenForGas) {
          setValue(SendFormFields.AmountFieldError, [
            'modals.send.errors.notEnoughNativeToken',
            { asset: feeAsset.symbol },
          ])
        }

        setValue(SendFormFields.CryptoAmountBaseUnit, maxCryptoBaseUnit.toString())
        setValue(SendFormFields.FiatAmount, maxFiat.toFixed(2))

        fnLogger.trace(
          {
            networkFeeCryptoBaseUnit,
            maxCryptoBaseUnit,
            maxFiat,
            hasEnoughNativeTokenForGas,
            nativeAssetBalanceBaseUnit,
          },
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
          : SendFormFields.CryptoAmountBaseUnit

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
        ? SendFormFields.CryptoAmountBaseUnit
        : SendFormFields.FiatAmount,
    )
  }

  return {
    balancesLoading,
    fieldName,
    cryptoBalanceBaseUnit,
    fiatBalance,
    handleNextClick,
    handleSendMax,
    handleInputChange,
    loading,
    toggleCurrency,
  }
}
