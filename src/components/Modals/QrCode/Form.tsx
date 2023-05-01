import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import type { FeeDataEstimate } from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Redirect, Route, Switch, useHistory, useLocation } from 'react-router-dom'
import { QrCodeScanner } from 'components/QrCodeScanner/QrCodeScanner'
import { SelectAssetRouter } from 'components/SelectAssets/SelectAssetRouter'
import { parseMaybeUrl } from 'lib/address/address'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectMarketDataById, selectSelectedCurrency } from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

import { useFormSend } from './hooks/useFormSend/useFormSend'
import { QrCodeFormFields, QrCodeRoutes } from './QrCodeCommon'
import { Address } from './views/Address'
import { Confirm } from './views/Confirm'
import { Details } from './views/Details'

export type QrCodeInput<T extends ChainId = ChainId> = {
  [QrCodeFormFields.AccountId]: AccountId
  [QrCodeFormFields.To]: string
  [QrCodeFormFields.From]: string
  [QrCodeFormFields.AmountFieldError]: string | [string, { asset: string }]
  [QrCodeFormFields.AssetId]: AssetId
  [QrCodeFormFields.CryptoAmount]: string
  [QrCodeFormFields.EstimatedFees]: FeeDataEstimate<T>
  [QrCodeFormFields.FeeType]: FeeDataKey
  [QrCodeFormFields.FiatAmount]: string
  [QrCodeFormFields.FiatSymbol]: string
  [QrCodeFormFields.Input]: string
  [QrCodeFormFields.Memo]?: string
  [QrCodeFormFields.SendMax]: boolean
  [QrCodeFormFields.VanityAddress]: string
}

type QrCodeFormProps = {
  assetId?: AssetId
  accountId?: AccountId
}

export const Form: React.FC<QrCodeFormProps> = ({ accountId }) => {
  const location = useLocation()
  const history = useHistory()
  const { handleFormSend } = useFormSend()
  const selectedCurrency = useAppSelector(selectSelectedCurrency)

  const methods = useForm<QrCodeInput>({
    mode: 'onChange',
    defaultValues: {
      accountId,
      to: '',
      vanityAddress: '',
      assetId: '',
      feeType: FeeDataKey.Average,
      cryptoAmount: '',
      fiatAmount: '',
      fiatSymbol: selectedCurrency,
    },
  })

  const handleAssetSelect = useCallback(
    (asset: Asset) => {
      // methods.setValue(QrCodeFormFields.AssetId, { ...asset, ...marketData })
      methods.setValue(QrCodeFormFields.Input, '')
      methods.setValue(QrCodeFormFields.AccountId, '')
      methods.setValue(QrCodeFormFields.CryptoAmount, '')
      methods.setValue(QrCodeFormFields.AssetId, asset.assetId)
      methods.setValue(QrCodeFormFields.FiatAmount, '')
      methods.setValue(QrCodeFormFields.FiatSymbol, selectedCurrency)

      history.push(QrCodeRoutes.Address)
    },
    [history, methods, selectedCurrency],
  )

  const handleBack = useCallback(() => {
    history.goBack()
  }, [history])

  const checkKeyDown = useCallback((event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter') event.preventDefault()
  }, [])

  const handleQrSuccess = useCallback(
    (decodedText: string) => {
      ;(async () => {
        // This should
        // - Parse the address, amount and asset. This should also exhaust URI parsers (EVM and UTXO currently) and set the amount/asset if applicable
        // - If there is a valid asset (i.e UTXO, or ETH, but not ERC-20s because they're unsafe), populates the asset and goes directly to the address step
        // If no valid asset is found, it should go to the select asset step
        const maybeUrlResult = await parseMaybeUrl({ value: decodedText })
        methods.setValue(QrCodeFormFields.AssetId, maybeUrlResult.assetId ?? '')
        methods.setValue(QrCodeFormFields.Input, decodedText.trim())
        methods.setValue(QrCodeFormFields.AssetId, maybeUrlResult.assetId ?? '')
        if (maybeUrlResult.amountCryptoPrecision) {
          const marketData = selectMarketDataById(store.getState(), maybeUrlResult.assetId ?? '')
          methods.setValue(QrCodeFormFields.CryptoAmount, maybeUrlResult.amountCryptoPrecision)
          methods.setValue(
            QrCodeFormFields.FiatAmount,
            bnOrZero(maybeUrlResult.amountCryptoPrecision).times(marketData.price).toString(),
          )
        }

        // We don't parse EIP-681 URLs because they're unsafe
        // Some wallets may be smart, like Trust just showing an address as a QR code to avoid dangerously unsafe parameters
        // Others might do dangerous tricks in the way they represent an asset, using various parameters to do so
        // There's also the fact that we will assume the AssetId to be the native one of the first chain we managed to validate the address
        // Which may not be the chain the user wants to send, or they may want to send a token - so we should always ask the user to select the asset
        if (maybeUrlResult.assetId === ethAssetId) return history.push(QrCodeRoutes.Select)
        history.push(QrCodeRoutes.Address)
      })()
    },
    [history, methods],
  )

  // TODO: Remove me
  useEffect(() => {
    history.push(QrCodeRoutes.Scan)
  }, [history])

  return (
    <FormProvider {...methods}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <form onSubmit={methods.handleSubmit(handleFormSend)} onKeyDown={checkKeyDown}>
        <AnimatePresence exitBeforeEnter initial={false}>
          <Switch location={location} key={location.key}>
            <Route path={QrCodeRoutes.Select}>
              <SelectAssetRouter onBack={handleBack} onClick={handleAssetSelect} />
            </Route>
            <Route path={QrCodeRoutes.Address}>
              <Address />
            </Route>
            <Route path={QrCodeRoutes.Details}>
              <Details />
            </Route>
            <Route path={QrCodeRoutes.Scan}>
              <QrCodeScanner onSuccess={handleQrSuccess} onBack={handleBack} />
            </Route>
            <Route path={QrCodeRoutes.Confirm}>
              <Confirm />
            </Route>
            <Redirect exact from='/' to={QrCodeRoutes.Scan} />
          </Switch>
        </AnimatePresence>
      </form>
    </FormProvider>
  )
}
