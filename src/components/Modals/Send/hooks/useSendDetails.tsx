import { useToast } from '@chakra-ui/react'
import { FeeData, FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import { getAssetData } from '@shapeshiftoss/market-service'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useBalances } from 'hooks/useBalances/useBalances'
import { bnOrZero } from 'lib/bignumber'
import get from 'lodash/get'
import { useEffect, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'

import { SendRoutes } from '../Send'

export enum AmountFieldName {
  Fiat = 'fiat.amount',
  Crypto = 'crypto.amount'
}

// TODO (technojak) this should be removed in favor of the asset-service. For now assume the fallback is eth
const ETH_PRECISION = 18

const flattenTokenBalances = (balances: any) =>
  Object.keys(balances).reduce((acc: any, key) => {
    const value = balances[key]
    acc[key] = value
    if (value.tokens) {
      value.tokens.forEach((token: any) => {
        acc[token.contract.toLowerCase()] = token
      })
    }
    return acc
  }, {})

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

export const useSendDetails = (): UseSendDetailsReturnType => {
  const [fieldName, setFieldName] = useState<AmountFieldName>(AmountFieldName.Fiat)
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
  const [asset, address] = useWatch({ name: ['asset', 'address'] })

  const { balances, error: balancesError, loading: balancesLoading } = useBalances()

  const chainAdapter = useChainAdapters()
  const {
    state: { wallet }
  } = useWallet()

  useEffect(() => {
    if (balancesError) {
      toast({
        status: 'error',
        description: translate(`modals.send.getBalanceError`),
        duration: 4000,
        isClosable: true,
        position: 'top-right'
      })
      history.push(SendRoutes.Address)
    }
  }, [balancesError, toast, history, translate])

  const cryptoError = get(errors, 'crypto.amount.message', null)
  const fiatError = get(errors, 'fiat.amount.message', null)
  const amountFieldError = cryptoError || fiatError

  const toggleCurrency = () => {
    if (amountFieldError) {
      const clearErrorKey = fiatError ? AmountFieldName.Fiat : AmountFieldName.Crypto
      const setErrorKey = fiatError ? AmountFieldName.Crypto : AmountFieldName.Fiat
      clearErrors(clearErrorKey)
      setError(setErrorKey, { message: 'common.insufficientFunds' })
    }
    setFieldName(fieldName === AmountFieldName.Fiat ? AmountFieldName.Crypto : AmountFieldName.Fiat)
  }

  /** When selecting new assets the network (CHAIN) is not returned from the market service. This will break */
  const adapter = chainAdapter.byChain(asset.network)

  const flattenedBalances = flattenTokenBalances(balances)
  const assetBalance = asset?.contractAddress
    ? flattenedBalances[asset?.contractAddress]
    : flattenedBalances[asset.network]

  const accountBalances = useMemo(() => {
    // TODO (technojak) decimals should come from asset-service not on the market data for the asset
    // Hard coding to eths decimals for now
    const crypto = bnOrZero(assetBalance?.balance).div(
      `1e${assetBalance?.decimals || ETH_PRECISION}`
    )
    const fiat = crypto.times(asset.price)
    return {
      crypto,
      fiat
    }
  }, [assetBalance, asset])

  const buildTransaction = async (): Promise<{
    txToSign: ETHSignTx
    estimatedFees: FeeData
  }> => {
    const values = getValues()
    if (wallet) {
      // TODO (technojak) get path and decimals from asset-service
      const path = "m/44'/60'/0'/0/0"
      const value = bnOrZero(values.crypto.amount)
        .times(bnOrZero(10).exponentiatedBy(values.asset.decimals || ETH_PRECISION))
        .toFixed(0)

      try {
        const data = await adapter.buildSendTransaction({
          to: values.address,
          value,
          erc20ContractAddress: values.asset.contractAddress,
          wallet,
          path
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
      setValue('transaction', txToSign)
      setValue('estimatedFees', estimatedFees)
      history.push(SendRoutes.Confirm)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(true)
    }
  }

  const handleSendMax = async () => {
    if (wallet) {
      setLoading(true)
      const path = "m/44'/60'/0'/0/0"
      const fromAddress = await adapter.getAddress({ wallet, path })
      const adapterFees = await adapter.getFeeData({
        to: address,
        from: fromAddress,
        value: asset.contractAddress ? '0' : assetBalance.balance,
        contractAddress: asset.contractAddress
      })
      // Assume average fee for send max
      const averageFee = adapterFees[FeeDataKey.Average]
      const chainAsset = await getAssetData(asset.network)
      // TODO (technojak) replace precision with data from asset service. Currently ETH specific
      const networkFee = bnOrZero(averageFee.networkFee)
        .div(`1e${ETH_PRECISION}`)
        .times(chainAsset?.price || 0)

      // TODO (technojak): change to tokenId when integrated with asset-service
      if (asset.contractAddress) {
        setValue('crypto.amount', accountBalances.crypto.toPrecision())
        setValue('fiat.amount', accountBalances.fiat.toPrecision())
      } else {
        const maxCrypto = accountBalances.crypto.minus(networkFee)
        const maxFiat = maxCrypto.times(chainAsset?.price || 0)
        setValue('crypto.amount', maxCrypto.toPrecision())
        setValue('fiat.amount', maxFiat.toPrecision())
      }
      setLoading(false)
    }
  }

  const handleInputChange = (inputValue: string) => {
    const key = fieldName !== AmountFieldName.Fiat ? AmountFieldName.Fiat : AmountFieldName.Crypto
    const assetPrice = asset.price
    const amount =
      fieldName === AmountFieldName.Fiat
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
