import { useToast } from '@chakra-ui/react'
import { utxoAccountParams } from '@shapeshiftoss/chain-adapters'
import { chainAdapters, ChainTypes, UtxoAccountType } from '@shapeshiftoss/types'
import get from 'lodash/get'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { AssetMarketData, useGetAssetData } from 'hooks/useAsset/useAsset'
import { useFlattenedBalances } from 'hooks/useBalances/useFlattenedBalances'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { ReduxState } from 'state/reducer'
import { getAccountTypeKey } from 'state/slices/preferencesSlice/preferencesSlice'

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
  const [asset, address] = useWatch({ name: [SendFormFields.Asset, SendFormFields.Address] }) as [
    AssetMarketData,
    string
  ]
  const { balances, error: balanceError, loading: balancesLoading } = useFlattenedBalances()
  const { assetBalance, accountBalances } = useAccountBalances({ asset, balances })
  const chainAdapterManager = useChainAdapters()
  const {
    state: { wallet }
  } = useWallet()

  const { chain, tokenId } = asset

  const getAssetData = useGetAssetData({ chain, tokenId })

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

  const adapter = chainAdapterManager.byChain(asset.chain)

  const currentAccountType: UtxoAccountType = useSelector(
    (state: ReduxState) => state.preferences[getAccountTypeKey(asset.chain)]
  )

  const estimateFees = async (): Promise<chainAdapters.FeeDataEstimate<ChainTypes>> => {
    const values = getValues()

    if (!wallet) throw new Error('No wallet connected')

    const value = bnOrZero(values.crypto.amount)
      .times(bnOrZero(10).exponentiatedBy(values.asset.precision))
      .toFixed(0)

    const accountParams = currentAccountType ? utxoAccountParams(asset, currentAccountType, 0) : {}

    const from = await adapter.getAddress({
      wallet,
      ...accountParams
    })

    switch (values.asset.chain) {
      case ChainTypes.Ethereum: {
        const ethereumChainAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)
        return ethereumChainAdapter.getFeeData({
          from,
          to: values.address,
          value,
          contractAddress: values.asset.tokenId
        })
      }
      case ChainTypes.Bitcoin: {
        const bitcoinChainAdapter = chainAdapterManager.byChain(ChainTypes.Bitcoin)
        return bitcoinChainAdapter.getFeeData({ from, to: values.address, value })
      }
      default:
        throw new Error('unsupported chain type')
    }
  }

  const handleNextClick = async () => {
    try {
      setLoading(true)
      const estimatedFees = await estimateFees()
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
      const to = address

      const accountParams = currentAccountType
        ? utxoAccountParams(asset, currentAccountType, 0)
        : {}
      const from = await adapter.getAddress({
        wallet,
        ...accountParams
      })

      // Assume fast fee for send max
      // This is used to make make sure its impossible to send more than our balance
      let fastFee: string = ''
      switch (chain) {
        case ChainTypes.Ethereum: {
          const ethAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)
          const contractAddress = tokenId
          const value = asset.tokenId ? '0' : assetBalance.balance
          const adapterFees = await ethAdapter.getFeeData({ to, from, value, contractAddress })
          fastFee = adapterFees.fast.chainSpecific.feePerTx
          break
        }
        case ChainTypes.Bitcoin: {
          const btcAdapter = chainAdapterManager.byChain(ChainTypes.Bitcoin)
          const value = assetBalance.balance
          const adapterFees = await btcAdapter.getFeeData({ to, from, value })
          fastFee = adapterFees.fast.feePerUnit
          break
        }
        default: {
          throw new Error(`useSendDetails(handleSendMax): no adapter available for chain ${chain}`)
        }
      }

      const marketData = await getAssetData({ chain, tokenId })
      // TODO: get network precision from network asset, not send asset
      const networkFee = bnOrZero(fastFee).div(`1e${asset.precision}`)

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
