import { useToast } from '@chakra-ui/react'
import {
  convertXpubVersion,
  toRootDerivationPath,
  utxoAccountParams
} from '@shapeshiftoss/chain-adapters'
import { bip32ToAddressNList } from '@shapeshiftoss/hdwallet-core'
import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { debounce } from 'lodash'
import { useCallback, useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { AssetMarketData, useGetAssetData } from 'hooks/useAsset/useAsset'
import { useFlattenedBalances } from 'hooks/useBalances/useFlattenedBalances'
import { BigNumber, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { ReduxState } from 'state/reducer'

import { SendFormFields } from '../../Form'
import { SendRoutes } from '../../Send'
import { useAccountBalances } from '../useAccountBalances/useAccountBalances'

type AmountFieldName = SendFormFields.FiatAmount | SendFormFields.CryptoAmount

type UseSendDetailsReturnType = {
  balancesLoading: boolean
  fieldName: AmountFieldName
  handleInputChange(inputValue: string): void
  handleNextClick(): void
  handleSendMax(): Promise<void>
  loading: boolean
  toggleCurrency(): void
  accountBalances: {
    crypto: BigNumber
    fiat: BigNumber
  }
}

export const useSendDetails = (): UseSendDetailsReturnType => {
  const [fieldName, setFieldName] = useState<AmountFieldName>(SendFormFields.FiatAmount)
  const [loading, setLoading] = useState<boolean>(false)
  const history = useHistory()
  const toast = useToast()
  const translate = useTranslate()
  const { getValues, setValue } = useFormContext()
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

  const currentAccountType = useSelector(
    (state: ReduxState) => state.preferences.accountTypes[asset.chain]
  )

  const estimateFormFees = useCallback(async (): Promise<
    chainAdapters.FeeDataEstimate<ChainTypes>
  > => {
    const values = getValues()

    if (!wallet) throw new Error('No wallet connected')

    const value = bnOrZero(values.crypto.amount)
      .times(bnOrZero(10).exponentiatedBy(values.asset.precision))
      .toFixed(0)

    switch (values.asset.chain) {
      case ChainTypes.Ethereum: {
        const from = await adapter.getAddress({
          wallet
        })
        const ethereumChainAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)
        return ethereumChainAdapter.getFeeData({
          to: values.address,
          value,
          chainSpecific: { from, contractAddress: values.asset.tokenId },
          sendMax: values.sendMax
        })
      }
      case ChainTypes.Bitcoin: {
        const accountParams = utxoAccountParams(asset, currentAccountType, 0)
        const pubkeys = await wallet.getPublicKeys([
          {
            coin: adapter.getType(),
            addressNList: bip32ToAddressNList(toRootDerivationPath(accountParams.bip32Params)),
            curve: 'secp256k1',
            scriptType: accountParams.scriptType
          }
        ])

        if (!pubkeys?.[0]?.xpub) throw new Error('no pubkeys')
        const pubkey = convertXpubVersion(pubkeys[0].xpub, currentAccountType)
        const bitcoinChainAdapter = chainAdapterManager.byChain(ChainTypes.Bitcoin)
        return bitcoinChainAdapter.getFeeData({
          to: values.address,
          value,
          chainSpecific: { pubkey },
          sendMax: values.sendMax
        })
      }
      default:
        throw new Error('unsupported chain type')
    }
  }, [adapter, asset, chainAdapterManager, currentAccountType, getValues, wallet])

  const handleNextClick = async () => {
    try {
      setLoading(true)
      history.push(SendRoutes.Confirm)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(true)
    }
  }

  const handleSendMax = async () => {
    if (assetBalance && wallet) {
      setValue(SendFormFields.SendMax, true)
      setLoading(true)
      const to = address

      const accountParams = currentAccountType
        ? utxoAccountParams(asset, currentAccountType, 0)
        : {}
      const from = await adapter.getAddress({
        wallet,
        accountType: currentAccountType,
        ...accountParams
      })

      // Assume fast fee for send max
      // This is used to make make sure its impossible to send more than our balance
      let fastFee: string = ''
      let adapterFees
      switch (chain) {
        case ChainTypes.Ethereum: {
          const ethAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)
          const contractAddress = tokenId
          const value = assetBalance.balance
          adapterFees = await ethAdapter.getFeeData({
            to,
            value,
            chainSpecific: { contractAddress, from },
            sendMax: true
          })
          fastFee = adapterFees.fast.txFee
          break
        }
        case ChainTypes.Bitcoin: {
          const accountParams = utxoAccountParams(asset, currentAccountType, 0)
          const pubkeys = await wallet.getPublicKeys([
            {
              coin: adapter.getType(),
              addressNList: bip32ToAddressNList(toRootDerivationPath(accountParams.bip32Params)),
              curve: 'secp256k1',
              scriptType: accountParams.scriptType
            }
          ])

          if (!pubkeys?.[0]?.xpub) throw new Error('no pubkeys')
          const pubkey = convertXpubVersion(pubkeys[0].xpub, currentAccountType)
          const btcAdapter = chainAdapterManager.byChain(ChainTypes.Bitcoin)
          const value = assetBalance.balance
          adapterFees = await btcAdapter.getFeeData({
            to,
            value,
            chainSpecific: { pubkey },
            sendMax: true
          })
          fastFee = adapterFees.fast.txFee
          break
        }
        default: {
          throw new Error(`useSendDetails(handleSendMax): no adapter available for chain ${chain}`)
        }
      }

      setValue(SendFormFields.EstimatedFees, adapterFees)
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleInputChange = useCallback(
    debounce(async (inputValue: string) => {
      setValue(SendFormFields.SendMax, false)
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

      const estimatedFees = await estimateFormFees()
      setValue(SendFormFields.EstimatedFees, estimatedFees)

      const values = getValues()

      const hasValidBalance = accountBalances.crypto
        .minus(fromBaseUnit(estimatedFees.fast.txFee, asset.precision))
        .gte(values.crypto.amount)

      if (!hasValidBalance) setValue(SendFormFields.AmountFieldError, 'common.insufficientFunds')
      else setValue(SendFormFields.AmountFieldError, '')
    }, 1000),
    [
      asset.price,
      fieldName,
      setValue,
      estimateFormFees,
      adapter,
      asset,
      chainAdapterManager,
      currentAccountType,
      getValues,
      wallet,
      accountBalances
    ]
  )

  const toggleCurrency = () => {
    setFieldName(
      fieldName === SendFormFields.FiatAmount
        ? SendFormFields.CryptoAmount
        : SendFormFields.FiatAmount
    )
  }

  return {
    balancesLoading,
    fieldName,
    accountBalances,
    handleInputChange,
    handleNextClick,
    handleSendMax,
    loading,
    toggleCurrency
  }
}
