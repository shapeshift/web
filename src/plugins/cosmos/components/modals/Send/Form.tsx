import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import type { CosmosSdkChainId } from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { AnimatePresence } from 'framer-motion'
import React from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import type { RouteComponentProps } from 'react-router-dom'
import { Redirect, Route, Switch, useHistory, useLocation } from 'react-router-dom'
import type { SendInput } from 'components/Modals/Send/Form'
import { useFormSend } from 'components/Modals/Send/hooks/useFormSend/useFormSend'
import { SendFormFields, SendRoutes } from 'components/Modals/Send/SendCommon'
import { Address } from 'components/Modals/Send/views/Address'
import { QrCodeScanner } from 'components/Modals/Send/views/QrCodeScanner'
import { SelectAssetRouter } from 'components/SelectAssets/SelectAssetRouter'
import { selectMarketDataById, selectSelectedCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Confirm } from './views/Confirm'
import { Details } from './views/Details'

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

  const methods = useForm<SendInput<CosmosSdkChainId>>({
    mode: 'onChange',
    defaultValues: {
      accountId,
      address: '',
      memo: '',
      vanityAddress: '',
      asset: initialAsset,
      feeType: FeeDataKey.Average,
      cryptoAmount: '',
      cryptoSymbol: initialAsset?.symbol,
      fiatAmount: '',
      fiatSymbol: selectedCurrency,
    },
  })

  const handleAssetSelect = async (asset: Asset) => {
    methods.setValue(SendFormFields.Asset, { ...asset, ...marketData })
    methods.setValue(SendFormFields.Input, '')
    methods.setValue(SendFormFields.AccountId, '')
    methods.setValue(SendFormFields.CryptoAmount, '')
    methods.setValue(SendFormFields.CryptoSymbol, asset.symbol)
    methods.setValue(SendFormFields.FiatAmount, '')
    methods.setValue(SendFormFields.FiatSymbol, selectedCurrency)

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
