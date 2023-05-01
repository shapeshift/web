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
import {
  selectAssetById,
  selectMarketDataById,
  selectSelectedCurrency,
} from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

import { useFormSend } from '../Send/hooks/useFormSend/useFormSend'
import { SendFormFields } from '../Send/SendCommon'
import { QrCodeRoutes } from './QrCodeCommon'
import { Address } from './views/Address'
import { Confirm } from './views/Confirm'
import { Details } from './views/Details'

export type SendInput<T extends ChainId = ChainId> = {
  [SendFormFields.AccountId]: AccountId
  [SendFormFields.To]: string
  [SendFormFields.From]: string
  [SendFormFields.AmountFieldError]: string | [string, { asset: string }]
  [SendFormFields.AssetId]: AssetId
  [SendFormFields.CryptoAmount]: string
  [SendFormFields.EstimatedFees]: FeeDataEstimate<T>
  [SendFormFields.FeeType]: FeeDataKey
  [SendFormFields.FiatAmount]: string
  [SendFormFields.FiatSymbol]: string
  [SendFormFields.Input]: string
  [SendFormFields.Memo]?: string
  [SendFormFields.SendMax]: boolean
  [SendFormFields.VanityAddress]: string
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

  const methods = useForm<SendInput>({
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
    (assetId: AssetId) => {
      const asset = selectAssetById(store.getState(), assetId ?? '')
      // This should never happen, but tsc
      if (!asset) return
      // methods.setValue(SendFormFields.AssetId, { ...asset, ...marketData })
      methods.setValue(SendFormFields.AssetId, asset.assetId)

      history.push(QrCodeRoutes.Address)
    },
    [history, methods],
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
        debugger
        const maybeUrlResult = await parseMaybeUrl({ value: decodedText })
        methods.setValue(SendFormFields.AssetId, maybeUrlResult.assetId ?? '')
        methods.setValue(SendFormFields.Input, decodedText.trim())
        methods.setValue(SendFormFields.AssetId, maybeUrlResult.assetId ?? '')
        if (maybeUrlResult.amountCryptoPrecision) {
          const marketData = selectMarketDataById(store.getState(), maybeUrlResult.assetId ?? '')
          methods.setValue(SendFormFields.CryptoAmount, maybeUrlResult.amountCryptoPrecision)
          methods.setValue(
            SendFormFields.FiatAmount,
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
