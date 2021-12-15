import { Asset, ChainTypes } from '@shapeshiftoss/types'
import { chainAdapters } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import React from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import {
  Redirect,
  Route,
  RouteComponentProps,
  Switch,
  useHistory,
  useLocation
} from 'react-router-dom'
import { AssetMarketData, useGetAssetData } from 'hooks/useAsset/useAsset'

import { SelectAssets } from '../../SelectAssets/SelectAssets'
import { useFormSend } from './hooks/useFormSend/useFormSend'
import { SendRoutes } from './Send'
import { Address } from './views/Address'
import { Confirm } from './views/Confirm'
import { Details } from './views/Details'
import { QrCodeScanner } from './views/QrCodeScanner'

export enum SendFormFields {
  Address = 'address',
  Asset = 'asset',
  FeeType = 'feeType',
  EstimatedFees = 'estimatedFees',
  CryptoAmount = 'cryptoAmount',
  CryptoSymbol = 'cryptoSymbol',
  FiatAmount = 'fiatAmount',
  FiatSymbol = 'fiatSymbol',
  Transaction = 'transaction',
  AmountFieldError = 'amountFieldError',
  SendMax = 'sendMax'
}

export type SendInput = {
  [SendFormFields.Address]: string
  [SendFormFields.AmountFieldError]: string
  [SendFormFields.Asset]: AssetMarketData
  [SendFormFields.FeeType]: chainAdapters.FeeDataKey
  [SendFormFields.EstimatedFees]: chainAdapters.FeeDataEstimate<ChainTypes>
  [SendFormFields.CryptoAmount]: string
  [SendFormFields.CryptoSymbol]: string
  [SendFormFields.FiatAmount]: string
  [SendFormFields.FiatSymbol]: string
  // TODO(0xdef1cafe): remove this from form state
  [SendFormFields.Transaction]: unknown
  [SendFormFields.SendMax]: boolean
}

type SendFormProps = {
  asset: AssetMarketData
}

export const Form = ({ asset: initialAsset }: SendFormProps) => {
  const location = useLocation()
  const history = useHistory()
  const { handleSend } = useFormSend()
  const getAssetData = useGetAssetData(initialAsset.caip19)

  const methods = useForm<SendInput>({
    mode: 'onChange',
    defaultValues: {
      address: '',
      asset: initialAsset,
      feeType: chainAdapters.FeeDataKey.Average,
      cryptoAmount: '',
      cryptoSymbol: initialAsset?.symbol,
      fiatAmount: '',
      fiatSymbol: 'USD' // TODO: use user preferences to get default fiat currency
    }
  })

  const handleAssetSelect = async (asset: Asset) => {
    const assetMarketData = await getAssetData(asset.caip19)
    if (!assetMarketData) return console.error('Failed to get marketData')
    methods.setValue(SendFormFields.Asset, { ...asset, ...assetMarketData })
    methods.setValue(SendFormFields.CryptoAmount, '')
    methods.setValue(SendFormFields.CryptoSymbol, asset.symbol)
    methods.setValue(SendFormFields.FiatAmount, '')
    methods.setValue(SendFormFields.FiatSymbol, 'USD')

    history.push(SendRoutes.Address)
  }

  const checkKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter') event.preventDefault()
  }

  return (
    <FormProvider {...methods}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <form onSubmit={methods.handleSubmit(handleSend)} onKeyDown={checkKeyDown}>
        <AnimatePresence exitBeforeEnter initial={false}>
          <Switch location={location} key={location.key}>
            <Route
              path={SendRoutes.Select}
              component={(props: RouteComponentProps) => (
                <SelectAssets onClick={handleAssetSelect} {...props} />
              )}
            />
            <Route path={SendRoutes.Address} component={Address} />
            <Route path={SendRoutes.Details} component={Details} />
            <Route path={SendRoutes.Scan} component={QrCodeScanner} />
            <Route path={SendRoutes.Confirm} component={Confirm} />
            <Redirect exact from='/' to={SendRoutes.Select} />
          </Switch>
        </AnimatePresence>
      </form>
    </FormProvider>
  )
}
