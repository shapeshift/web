import { ChainId } from '@shapeshiftoss/caip'
import { FeeDataEstimate, FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { Asset } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import React from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import {
  Redirect,
  Route,
  RouteComponentProps,
  Switch,
  useHistory,
  useLocation,
} from 'react-router-dom'
import { SendRoutes } from 'components/Modals/Send/SendCommon'
import { Address } from 'components/Modals/Send/views/Address'
import { QrCodeScanner } from 'components/Modals/Send/views/QrCodeScanner'
import { SelectAssetRouter } from 'components/SelectAssets/SelectAssetRouter'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useFormSend } from './hooks/useFormSend/useFormSend'
import { SendFormFields } from './SendCommon'
import { Confirm } from './views/Confirm'
import { Details } from './views/Details'

export type SendInput = {
  [SendFormFields.Address]: string
  [SendFormFields.Memo]?: string
  [SendFormFields.AccountId]: AccountSpecifier
  [SendFormFields.AmountFieldError]: string | [string, { asset: string }]
  [SendFormFields.Asset]: Asset
  [SendFormFields.FeeType]: FeeDataKey
  [SendFormFields.EstimatedFees]: FeeDataEstimate<ChainId>
  [SendFormFields.CryptoAmount]: string
  [SendFormFields.CryptoSymbol]: string
  [SendFormFields.FiatAmount]: string
  [SendFormFields.FiatSymbol]: string
  [SendFormFields.SendMax]: boolean
}

type SendFormProps = {
  asset: Asset
  accountId?: AccountSpecifier
}

export const Form = ({ asset: initialAsset, accountId }: SendFormProps) => {
  const location = useLocation()
  const history = useHistory()
  const { handleSend } = useFormSend()
  const marketData = useAppSelector(state => selectMarketDataById(state, initialAsset.assetId))

  const methods = useForm<SendInput>({
    mode: 'onChange',
    defaultValues: {
      accountId,
      address: '',
      memo: '',
      asset: initialAsset,
      feeType: FeeDataKey.Average,
      cryptoAmount: '',
      cryptoSymbol: initialAsset?.symbol,
      fiatAmount: '',
      fiatSymbol: 'USD', // TODO: use user preferences to get default fiat currency
    },
  })

  const handleAssetSelect = async (asset: Asset, accountId: AccountSpecifier) => {
    methods.setValue(SendFormFields.Asset, { ...asset, ...marketData })
    methods.setValue(SendFormFields.CryptoAmount, '')
    methods.setValue(SendFormFields.CryptoSymbol, asset.symbol)
    methods.setValue(SendFormFields.FiatAmount, '')
    methods.setValue(SendFormFields.FiatSymbol, 'USD')
    methods.setValue(SendFormFields.AccountId, accountId)

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
                <SelectAssetRouter onClick={handleAssetSelect} {...props} />
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
