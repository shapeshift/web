import {
  convertXpubVersion,
  toRootDerivationPath,
  utxoAccountParams
} from '@shapeshiftoss/chain-adapters'
import { bip32ToAddressNList } from '@shapeshiftoss/hdwallet-core'
import { chainAdapters, ChainTypes, UtxoAccountType } from '@shapeshiftoss/types'
import { debounce } from 'lodash'
import { useCallback, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { ReduxState } from 'state/reducer'
import { selectFeeAssetById } from 'state/slices/assetsSlice/assetsSlice'
import { selectMarketDataById } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  selectPortfolioCryptoBalanceById,
  selectPortfolioCryptoHumanBalanceByAccountTypeAndAssetId,
  selectPortfolioFiatBalanceById
} from 'state/slices/portfolioSlice/portfolioSlice'
import { useAppSelector } from 'state/store'

import { SendFormFields, SendInput } from '../../Form'
import { SendRoutes } from '../../Send'

type AmountFieldName = SendFormFields.FiatAmount | SendFormFields.CryptoAmount

type UseSendDetailsReturnType = {
  balancesLoading: boolean
  fieldName: AmountFieldName
  handleInputChange(inputValue: string): void
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
  const [fieldName, setFieldName] = useState<AmountFieldName>(SendFormFields.FiatAmount)
  const [loading, setLoading] = useState<boolean>(false)
  const history = useHistory()
  const { getValues, setValue } = useFormContext<SendInput>()
  const asset = useWatch<SendInput, SendFormFields.Asset>({ name: SendFormFields.Asset })
  const address = useWatch<SendInput, SendFormFields.Address>({ name: SendFormFields.Address })
  const price = bnOrZero(useAppSelector(state => selectMarketDataById(state, asset.caip19)).price)

  const feeAsset = useAppSelector(state => selectFeeAssetById(state, asset.caip19))
  const balancesLoading = false
  const accountType: UtxoAccountType | undefined = useSelector(
    (state: ReduxState) => state.preferences.accountTypes[asset.chain]
  )

  // TODO(0xdef1cafe): this is a janky temporary fix till we implement accounts next week
  const cryptoHumanBalance = bnOrZero(
    useAppSelector(state =>
      selectPortfolioCryptoHumanBalanceByAccountTypeAndAssetId(state, asset.caip19, accountType)
    )
  )

  const fiatBalance = bnOrZero(
    useAppSelector(state => selectPortfolioFiatBalanceById(state, asset.caip19))
  )
  const assetBalance = useAppSelector(state =>
    selectPortfolioCryptoBalanceById(state, asset.caip19)
  )
  const chainAdapterManager = useChainAdapters()
  const {
    state: { wallet }
  } = useWallet()

  const { chain, tokenId } = asset

  const adapter = chainAdapterManager.byChain(asset.chain)

  const currentAccountType = useSelector(
    (state: ReduxState) => state.preferences.accountTypes[asset.chain]
  )

  const estimateFormFees = useCallback(async (): Promise<
    chainAdapters.FeeDataEstimate<ChainTypes>
  > => {
    const values = getValues()

    if (!wallet) throw new Error('No wallet connected')

    const value = bnOrZero(values.cryptoAmount)
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
            addressNList: bip32ToAddressNList(toRootDerivationPath(accountParams.bip44Params)),
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
    // we can always send the full balance of tokens, no need to make network
    // calls to estimate fees
    if (feeAsset.caip19 !== asset.caip19) {
      setValue(SendFormFields.CryptoAmount, cryptoHumanBalance.toPrecision())
      setValue(SendFormFields.FiatAmount, fiatBalance.toFixed(2))
      return
    }

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
          const value = assetBalance
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
              addressNList: bip32ToAddressNList(toRootDerivationPath(accountParams.bip44Params)),
              curve: 'secp256k1',
              scriptType: accountParams.scriptType
            }
          ])

          if (!pubkeys?.[0]?.xpub) throw new Error('no pubkeys')
          const pubkey = convertXpubVersion(pubkeys[0].xpub, currentAccountType)
          const btcAdapter = chainAdapterManager.byChain(ChainTypes.Bitcoin)
          const value = assetBalance
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

      const networkFee = bnOrZero(bn(fastFee).div(`1e${feeAsset.precision}`))

      const maxCrypto = cryptoHumanBalance.minus(networkFee)
      const maxFiat = maxCrypto.times(price)
      setValue(SendFormFields.CryptoAmount, maxCrypto.toPrecision())
      setValue(SendFormFields.FiatAmount, maxFiat.toFixed(2))
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
      const amount =
        fieldName === SendFormFields.FiatAmount
          ? bnOrZero(bn(inputValue).div(price)).toString()
          : bnOrZero(bn(inputValue).times(price)).toString()

      setValue(key, amount)

      const estimatedFees = await estimateFormFees()
      setValue(SendFormFields.EstimatedFees, estimatedFees)

      const values = getValues()

      let hasValidBalance = false
      // we only need to deduct fees if we're sending the fee asset
      if (feeAsset.caip19 === asset.caip19) {
        hasValidBalance = cryptoHumanBalance
          .minus(fromBaseUnit(estimatedFees.fast.txFee, feeAsset.precision))
          .gte(values.cryptoAmount)
      } else {
        hasValidBalance = cryptoHumanBalance.gte(values.cryptoAmount)
      }

      setValue(SendFormFields.AmountFieldError, hasValidBalance ? '' : 'common.insufficientFunds')
    }, 1000),
    [asset, fieldName, setValue, estimateFormFees, getValues, cryptoHumanBalance, fiatBalance]
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
    cryptoHumanBalance,
    fiatBalance,
    handleInputChange,
    handleNextClick,
    handleSendMax,
    loading,
    toggleCurrency
  }
}
