import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import type { FeeDataEstimate } from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { AnimatePresence } from 'framer-motion'
import { useCallback } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Redirect, Route, Switch, useHistory, useLocation } from 'react-router-dom'
import { SelectAssetRouter } from 'components/SelectAssets/SelectAssetRouter'
import { selectMarketDataById, selectSelectedCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useFormSend } from './hooks/useFormSend/useFormSend'
import { SendFormFields, SendRoutes } from './SendCommon'
import { Address } from './views/Address'
import { Confirm } from './views/Confirm'
import { Details } from './views/Details'
import { QrCodeScanner } from './views/QrCodeScanner'

export type SendInput<T extends ChainId = ChainId> = {
  [SendFormFields.AccountId]: AccountId
  [SendFormFields.Address]: string
  [SendFormFields.AmountFieldError]: string | [string, { asset: string }]
  [SendFormFields.Asset]: Asset
  [SendFormFields.CryptoAmount]: string
  [SendFormFields.CryptoSymbol]: string
  [SendFormFields.EstimatedFees]: FeeDataEstimate<T>
  [SendFormFields.FeeType]: FeeDataKey
  [SendFormFields.FiatAmount]: string
  [SendFormFields.FiatSymbol]: string
  [SendFormFields.Input]: string
  [SendFormFields.Memo]?: string
  [SendFormFields.SendMax]: boolean
  [SendFormFields.VanityAddress]: string
}

type SendFormProps = {
  asset: Asset
  accountId?: AccountId
}

export const Form: React.FC<SendFormProps> = ({ asset: initialAsset, accountId }) => {
  const location = useLocation()
  const history = useHistory()
  const { handleSend } = useFormSend()
  const selectedCurrency = useAppSelector(selectSelectedCurrency)
  const marketData = useAppSelector(state => selectMarketDataById(state, initialAsset.assetId))

  const methods = useForm<SendInput>({
    mode: 'onChange',
    defaultValues: {
      accountId,
      address: '',
      vanityAddress: '',
      asset: initialAsset,
      feeType: FeeDataKey.Average,
      cryptoAmount: '',
      cryptoSymbol: initialAsset?.symbol,
      fiatAmount: '',
      fiatSymbol: selectedCurrency,
    },
  })

  const handleAssetSelect = useCallback(
    (asset: Asset) => {
      methods.setValue(SendFormFields.Asset, { ...asset, ...marketData })
      methods.setValue(SendFormFields.Input, '')
      methods.setValue(SendFormFields.AccountId, '')
      methods.setValue(SendFormFields.CryptoAmount, '')
      methods.setValue(SendFormFields.CryptoSymbol, asset.symbol)
      methods.setValue(SendFormFields.FiatAmount, '')
      methods.setValue(SendFormFields.FiatSymbol, selectedCurrency)

      history.push(SendRoutes.Address)
    },
    [history, marketData, methods, selectedCurrency],
  )

  const handleSelectBack = useCallback(() => {
    history.goBack()
  }, [history])

  const checkKeyDown = useCallback((event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter') event.preventDefault()
  }, [])

  return (
    <FormProvider {...methods}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <form onSubmit={methods.handleSubmit(handleSend)} onKeyDown={checkKeyDown}>
        <AnimatePresence exitBeforeEnter initial={false}>
          <Switch location={location} key={location.key}>
            <Route path={SendRoutes.Select}>
              <SelectAssetRouter onBack={handleSelectBack} onClick={handleAssetSelect} />
            </Route>
            <Route path={SendRoutes.Address}>
              <Address />
            </Route>
            <Route path={SendRoutes.Details}>
              <Details />
            </Route>
            <Route path={SendRoutes.Scan}>
              <QrCodeScanner />
            </Route>
            <Route path={SendRoutes.Confirm}>
              <Confirm />
            </Route>
            <Redirect exact from='/' to={SendRoutes.Select} />
          </Switch>
        </AnimatePresence>
      </form>
    </FormProvider>
  )
}
