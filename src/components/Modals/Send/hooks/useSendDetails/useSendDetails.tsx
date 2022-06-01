import { convertXpubVersion, toRootDerivationPath } from '@shapeshiftoss/chain-adapters'
import { bip32ToAddressNList } from '@shapeshiftoss/hdwallet-core'
import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { debounce } from 'lodash'
import { useCallback, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { ensLookup } from 'lib/ens'
import { logger } from 'lib/logger'
import { isEthAddress } from 'lib/utils'
import { accountIdToUtxoParams } from 'state/slices/portfolioSlice/utils'
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
  handleInputChange(inputValue: string): void
  handleNextClick(): void
  handleSendMax(): Promise<void>
  loading: boolean
  toggleCurrency(): void
  cryptoHumanBalance: BigNumber
  fiatBalance: BigNumber
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
      selectPortfolioCryptoBalanceByFilter(state, { assetId: feeAsset.assetId, accountId }),
    ),
  )

  const chainAdapterManager = useChainAdapters()
  const {
    state: { wallet },
  } = useWallet()

  const { chain, tokenId } = asset

  const adapter = chainAdapterManager.byChain(asset.chain)

  const estimateFormFees = useCallback(async (): Promise<
    chainAdapters.FeeDataEstimate<ChainTypes>
  > => {
    const values = getValues()

    if (!wallet) throw new Error('No wallet connected')

    const value = bnOrZero(values.cryptoAmount)
      .times(bnOrZero(10).exponentiatedBy(values.asset.precision))
      .toFixed(0)

    switch (values.asset.chain) {
      case ChainTypes.Cosmos: {
        const cosmosChainAdapter = await chainAdapterManager.byChainId('cosmos:cosmoshub-4')
        return cosmosChainAdapter.getFeeData({})
      }
      case ChainTypes.Osmosis: {
        const osmosisChainAdapter = await chainAdapterManager.byChainId('cosmos:osmosis-1')
        return osmosisChainAdapter.getFeeData({})
      }
      case ChainTypes.Ethereum: {
        const from = await adapter.getAddress({
          wallet,
        })
        const ethereumChainAdapter = await chainAdapterManager.byChainId('eip155:1')
        const to = isEthAddress(values.address)
          ? values.address
          : ((await ensLookup(values.address)).address as string)
        return ethereumChainAdapter.getFeeData({
          to,
          value,
          chainSpecific: {
            from,
            contractAddress: values.asset.tokenId,
          },
          sendMax: values.sendMax,
        })
      }
      case ChainTypes.Bitcoin: {
        const { utxoParams, accountType } = accountIdToUtxoParams(asset, accountId, 0)
        if (!utxoParams) throw new Error('useSendDetails: no utxoParams from accountIdToUtxoParams')
        if (!accountType) {
          throw new Error('useSendDetails: no accountType from accountIdToUtxoParams')
        }
        const { bip44Params, scriptType } = utxoParams
        const pubkeys = await wallet.getPublicKeys([
          {
            coin: adapter.getType(),
            addressNList: bip32ToAddressNList(toRootDerivationPath(bip44Params)),
            curve: 'secp256k1',
            scriptType,
          },
        ])

        if (!pubkeys?.[0]?.xpub) throw new Error('no pubkeys')
        const pubkey = convertXpubVersion(pubkeys[0].xpub, accountType)
        const bitcoinChainAdapter = await chainAdapterManager.byChainId(
          'bip122:000000000019d6689c085ae165831e93',
        )
        return bitcoinChainAdapter.getFeeData({
          to: values.address,
          value,
          chainSpecific: { pubkey },
          sendMax: values.sendMax,
        })
      }
      default:
        throw new Error('unsupported chain type')
    }
  }, [accountId, adapter, asset, chainAdapterManager, getValues, wallet])

  const handleNextClick = async () => {
    try {
      setLoading(true)
      history.push(SendRoutes.Confirm)
    } catch (e) {
      moduleLogger.error(e, 'This should never happen')
    } finally {
      setLoading(true)
    }
  }

  const handleSendMax = async () => {
    const fnLogger = moduleLogger.child({ namespace: ['handleSendMax'] })
    fnLogger.trace(
      { asset: asset.assetId, feeAsset: feeAsset.assetId, cryptoHumanBalance, fiatBalance },
      'Send Max',
    )

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
        const { utxoParams, accountType } = accountIdToUtxoParams(asset, accountId, 0)
        fnLogger.trace({ utxoParams, accountType, chain }, 'Getting Address...')
        const from = await adapter.getAddress({
          wallet,
          accountType,
          ...utxoParams,
        })

        // Assume fast fee for send max
        // This is used to make make sure its impossible to send more than our balance
        let fastFee: string = ''
        let adapterFees
        switch (chain) {
          case ChainTypes.Cosmos: {
            const cosmosAdapter = await chainAdapterManager.byChainId('cosmos:cosmoshub-4')
            adapterFees = await cosmosAdapter.getFeeData({})
            fastFee = adapterFees.fast.txFee
            break
          }
          case ChainTypes.Ethereum: {
            const ethAdapter = await chainAdapterManager.byChainId('eip155:1')
            const contractAddress = tokenId
            const value = assetBalance
            adapterFees = await ethAdapter.getFeeData({
              to,
              value,
              chainSpecific: { contractAddress, from },
              sendMax: true,
            })
            fastFee = adapterFees.fast.txFee
            break
          }
          case ChainTypes.Bitcoin: {
            if (!accountType)
              throw new Error('useSendDetails: no accountType from accountIdToUtxoParams')
            if (!utxoParams) {
              throw new Error('useSendDetails: no utxoParams from accountIdToUtxoParams')
            }
            const { bip44Params, scriptType } = utxoParams
            const pubkeys = await wallet.getPublicKeys([
              {
                coin: adapter.getType(),
                addressNList: bip32ToAddressNList(toRootDerivationPath(bip44Params)),
                curve: 'secp256k1',
                scriptType,
              },
            ])

            if (!pubkeys?.[0]?.xpub) throw new Error('no pubkeys')
            const pubkey = convertXpubVersion(pubkeys[0].xpub, accountType)
            const btcAdapter = await chainAdapterManager.byChainId(
              'bip122:000000000019d6689c085ae165831e93',
            )
            const value = assetBalance
            adapterFees = await btcAdapter.getFeeData({
              to,
              value,
              chainSpecific: { pubkey },
              sendMax: true,
            })
            fastFee = adapterFees.fast.txFee
            break
          }
          default: {
            throw new Error(
              `useSendDetails(handleSendMax): no adapter available for chain ${chain}`,
            )
          }
        }

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

  const inputHandler = useCallback(
    async (inputValue: string) => {
      setLoading(true)
      setValue(SendFormFields.SendMax, false)
      const key =
        fieldName !== SendFormFields.FiatAmount
          ? SendFormFields.FiatAmount
          : SendFormFields.CryptoAmount
      if (inputValue === '') {
        // Don't show an error message when the input is empty
        setValue(SendFormFields.AmountFieldError, '')
        setLoading(false)
        // Set value of the other input to an empty string as well
        setValue(key, '')
        return
      }
      const amount =
        fieldName === SendFormFields.FiatAmount
          ? bnOrZero(bn(inputValue).div(price)).toString()
          : bnOrZero(bn(inputValue).times(price)).toString()

      setValue(key, amount)

      let estimatedFees

      try {
        estimatedFees = await estimateFormFees()
        setValue(SendFormFields.EstimatedFees, estimatedFees)
      } catch (e) {
        setValue(SendFormFields.AmountFieldError, 'common.insufficientFunds')
        setLoading(false)

        throw e
      }

      const values = getValues()

      const hasValidBalance = cryptoHumanBalance.gte(values.cryptoAmount)
      const hasEnoughNativeTokenForGas = nativeAssetBalance
        .minus(estimatedFees.fast.txFee)
        .isPositive()

      if (!hasValidBalance) {
        setValue(SendFormFields.AmountFieldError, 'common.insufficientFunds')
      } else if (!hasEnoughNativeTokenForGas) {
        setValue(SendFormFields.AmountFieldError, [
          'modals.send.errors.notEnoughNativeToken',
          { asset: feeAsset.symbol },
        ])
      } else {
        // Remove existing error messages because the send amount is valid
        setValue(SendFormFields.AmountFieldError, '')
      }
      setLoading(false)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [estimateFormFees, feeAsset.symbol, fieldName, getValues, setValue],
  )

  const handleInputChange = useMemo(
    () => debounce(inputHandler, 1000, { leading: true }),
    [inputHandler],
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
    handleInputChange,
    handleNextClick,
    handleSendMax,
    loading,
    toggleCurrency,
  }
}
