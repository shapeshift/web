import { useToast } from '@chakra-ui/react'
import { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import { ChainAdapters, ChainTypes } from '@shapeshiftoss/types'
import get from 'lodash/get'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useGetAssetData } from 'hooks/useAsset/useAsset'
import { useFlattenedBalances } from 'hooks/useBalances/useFlattenedBalances'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { SendFormFields } from '../../Form'
import { SendRoutes } from '../../Send'
import { useAccountBalances } from '../useAccountBalances/useAccountBalances'

type AmountFieldName = SendFormFields.FiatAmount | SendFormFields.CryptoAmount

type UseSendDetailsReturnType = {
  amountFieldError: string
  balancesLoading: boolean
  fieldName: AmountFieldName
  handleInputChange(inputValue: string): void
  handleNextClick(): Promise<void>
  handleSendMax(): Promise<void>
  loading: boolean
  toggleCurrency(): void
  validateCryptoAmount(value: string): boolean | string
  validateFiatAmount(value: string): boolean | string
}

// TODO (technojak) this should be removed in favor of the asset-service. For now assume the fallback is eth
const ETH_PRECISION = 18

export const useSendDetails = (): UseSendDetailsReturnType => {
  const [fieldName, setFieldName] = useState<AmountFieldName>(SendFormFields.FiatAmount)
  const [loading, setLoading] = useState<boolean>(false)
  const history = useHistory()
  const toast = useToast()
  const translate = useTranslate()
  const {
    clearErrors,
    getValues,
    setValue,
    setError,
    formState: { errors }
  } = useFormContext()
  const [asset, address] = useWatch({ name: [SendFormFields.Asset, SendFormFields.Address] })
  const { balances, error: balanceError, loading: balancesLoading } = useFlattenedBalances()
  const { assetBalance, accountBalances } = useAccountBalances({ asset, balances })
  const chainAdapter = useChainAdapters()
  const {
    state: { wallet }
  } = useWallet()

  const getAssetData = useGetAssetData({
    chain: asset.chain,
    tokenId: asset.tokenId
  })

  useEffect(() => {
    if (balanceError) {
      toast({
        status: 'error',
        description: translate(`modals.send.getBalanceError`),
        duration: 4000,
        isClosable: true,
        position: 'top-right'
      })
      history.push(SendRoutes.Address)
    }
  }, [balanceError, toast, history, translate])

  const adapter = chainAdapter.byChain(asset.chain)

  const buildTransaction = async (): Promise<{
    txToSign: ETHSignTx
    estimatedFees: ChainAdapters.FeeDataEstimate<ChainTypes>
  }> => {
    const values = getValues()
    if (wallet) {
      const value = bnOrZero(values.crypto.amount)
        .times(bnOrZero(10).exponentiatedBy(values.asset.precision || ETH_PRECISION))
        .toFixed(0)

      try {
        const data = await adapter.buildSendTransaction({
          to: values.address,
          value,
          erc20ContractAddress: values.asset.tokenId,
          wallet
        })
        return data
      } catch (error) {
        throw error
      }
    }
    throw new Error('No wallet connected')
  }

  const handleNextClick = async () => {
    try {
      setLoading(true)
      const { txToSign, estimatedFees } = await buildTransaction()
      setValue(SendFormFields.Transaction, txToSign)
      setValue(SendFormFields.EstimatedFees, estimatedFees)
      history.push(SendRoutes.Confirm)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(true)
    }
  }

  const handleSendMax = async () => {
    if (assetBalance && wallet) {
      setLoading(true)
      const fromAddress = await adapter.getAddress({ wallet })
      const adapterFees = await adapter.getFeeData({
        to: address,
        from: fromAddress,
        value: asset.tokenId ? '0' : assetBalance.balance,
        contractAddress: asset.tokenId
      })
      // Assume fast fee for send max
      const fastFee = adapterFees[ChainAdapters.FeeDataKey.Fast]
      const marketData = await getAssetData({
        chain: asset.chain,
        tokenId: asset.tokenId
      })
      const networkFee = bnOrZero(fastFee.networkFee).div(`1e${asset.precision}`)

      if (asset.tokenId) {
        setValue(SendFormFields.CryptoAmount, accountBalances.crypto.toPrecision())
        setValue(SendFormFields.FiatAmount, accountBalances.fiat.toFixed(2))
      } else {
        const maxCrypto = accountBalances.crypto.minus(networkFee)
        const maxFiat = maxCrypto.times(marketData?.price || 0)
        setValue(SendFormFields.CryptoAmount, maxCrypto.toPrecision())
        setValue(SendFormFields.FiatAmount, maxFiat.toFixed(2))
      }
      setLoading(false)
    }
  }

  const handleInputChange = (inputValue: string) => {
    const key =
      fieldName !== SendFormFields.FiatAmount
        ? SendFormFields.FiatAmount
        : SendFormFields.CryptoAmount
    const assetPrice = asset.price
    const amount =
      fieldName === SendFormFields.FiatAmount
        ? bnOrZero(inputValue).div(assetPrice).toString()
        : bnOrZero(inputValue).times(assetPrice).toString()
    setValue(key, amount)
  }

  const validateCryptoAmount = (value: string) => {
    const hasValidBalance = accountBalances.crypto.gte(value)
    return hasValidBalance || 'common.insufficientFunds'
  }

  const validateFiatAmount = (value: string) => {
    const hasValidBalance = accountBalances.fiat.gte(value)
    return hasValidBalance || 'common.insufficientFunds'
  }

  const cryptoError = get(errors, 'crypto.amount.message', null)
  const fiatError = get(errors, 'fiat.amount.message', null)
  const amountFieldError = cryptoError || fiatError

  const toggleCurrency = () => {
    if (amountFieldError) {
      // Toggles an existing error to the other field if present
      const clearErrorKey = fiatError ? SendFormFields.FiatAmount : SendFormFields.CryptoAmount
      const setErrorKey = fiatError ? SendFormFields.CryptoAmount : SendFormFields.FiatAmount
      clearErrors(clearErrorKey)
      setError(setErrorKey, { message: 'common.insufficientFunds' })
    }
    setFieldName(
      fieldName === SendFormFields.FiatAmount
        ? SendFormFields.CryptoAmount
        : SendFormFields.FiatAmount
    )
  }

  return {
    amountFieldError,
    balancesLoading,
    fieldName,
    handleInputChange,
    handleNextClick,
    handleSendMax,
    loading,
    toggleCurrency,
    validateCryptoAmount,
    validateFiatAmount
  }
}
