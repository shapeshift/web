import { ChainId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { bitcoin, cosmos, ethereum, FeeDataEstimate } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { debounce } from 'lodash'
import { useCallback, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
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
  const accountSpecifier = useWatch<SendInput, SendFormFields.AccountId>({
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
        accountId: accountSpecifier,
      }),
    ),
  )

  const fiatBalance = bnOrZero(
    useAppSelector(state =>
      selectPortfolioFiatBalanceByFilter(state, { assetId, accountId: accountSpecifier }),
    ),
  )

  const assetBalance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, { assetId, accountId: accountSpecifier }),
  )

  const nativeAssetBalance = bnOrZero(
    useAppSelector(state =>
      selectPortfolioCryptoBalanceByFilter(state, {
        assetId: feeAsset.assetId,
        accountId: accountSpecifier,
      }),
    ),
  )

  const chainAdapterManager = useChainAdapters()
  const {
    state: { wallet },
  } = useWallet()

  const { assetReference } = fromAssetId(assetId)
  const contractAddress = tokenOrUndefined(assetReference)

  const adapter = chainAdapterManager.get(asset.chainId)
  if (!adapter) throw new Error(`No adapter available for ${asset.chainId}`)

  const estimateFormFees = useCallback(async (): Promise<FeeDataEstimate<ChainId>> => {
    const values = getValues()
    if (!wallet) throw new Error('No wallet connected')

    const { account } = fromAccountId(accountSpecifier)

    const value = bnOrZero(values.cryptoAmount)
      .times(bnOrZero(10).exponentiatedBy(values.asset.precision))
      .toFixed(0)

    switch (values.asset.chainId) {
      case KnownChainIds.CosmosMainnet:
      case KnownChainIds.OsmosisMainnet: {
        const adapter = chainAdapterManager.get(values.asset.chainId)
        if (!adapter) throw new Error(`No adapter available for ${values.asset.chainId}`)
        return adapter.getFeeData({})
      }
      case KnownChainIds.EthereumMainnet: {
        const ethereumChainAdapter = chainAdapterManager.get(KnownChainIds.EthereumMainnet) as
          | ethereum.ChainAdapter
          | undefined
        if (!ethereumChainAdapter)
          throw new Error(`No adapter available for ${KnownChainIds.EthereumMainnet}`)
        const to = values.address
        return ethereumChainAdapter.getFeeData({
          to,
          value,
          chainSpecific: {
            from: account,
            contractAddress,
          },
          sendMax: values.sendMax,
        })
      }
      case KnownChainIds.BitcoinMainnet: {
        const bitcoinChainAdapter = (await chainAdapterManager.get(
          KnownChainIds.BitcoinMainnet,
        )) as bitcoin.ChainAdapter | undefined
        if (!bitcoinChainAdapter)
          throw new Error(`No adapter available for ${KnownChainIds.BitcoinMainnet}`)
        return bitcoinChainAdapter.getFeeData({
          to: values.address,
          value,
          chainSpecific: { pubkey: account },
          sendMax: values.sendMax,
        })
      }
      default:
        throw new Error('unsupported chain type')
    }
  }, [accountSpecifier, chainAdapterManager, contractAddress, getValues, wallet])

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
        const { chainId, account } = fromAccountId(accountSpecifier)
        fnLogger.error({ chainId, account, accountSpecifier }, 'debug')
        const { fastFee, adapterFees } = await (async () => {
          switch (chainId) {
            case KnownChainIds.CosmosMainnet: {
              const cosmosAdapter = chainAdapterManager.get(KnownChainIds.CosmosMainnet) as
                | cosmos.ChainAdapter
                | undefined
              if (!cosmosAdapter)
                throw new Error(`No adapter available for ${KnownChainIds.CosmosMainnet}`)
              const adapterFees = await cosmosAdapter.getFeeData({})
              const fastFee = adapterFees.fast.txFee
              return { adapterFees, fastFee }
            }
            case KnownChainIds.EthereumMainnet: {
              const ethAdapter = chainAdapterManager.get(KnownChainIds.EthereumMainnet) as
                | ethereum.ChainAdapter
                | undefined
              if (!ethAdapter)
                throw new Error(`No adapter available for ${KnownChainIds.EthereumMainnet}`)
              const value = assetBalance
              const adapterFees = await ethAdapter.getFeeData({
                to,
                value,
                chainSpecific: { contractAddress, from: accountSpecifier },
                sendMax: true,
              })
              const fastFee = adapterFees.fast.txFee
              return { adapterFees, fastFee }
            }
            case KnownChainIds.BitcoinMainnet: {
              const btcAdapter = (await chainAdapterManager.get(KnownChainIds.BitcoinMainnet)) as
                | bitcoin.ChainAdapter
                | undefined
              if (!btcAdapter)
                throw new Error(`No adapter available for ${KnownChainIds.BitcoinMainnet}`)
              const value = assetBalance
              const adapterFees = await btcAdapter.getFeeData({
                to,
                value,
                chainSpecific: { pubkey: accountSpecifier },
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
