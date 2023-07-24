import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import type { FeeDataEstimate } from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Redirect, Route, Switch, useHistory, useLocation } from 'react-router-dom'
import { QrCodeScanner } from 'components/QrCodeScanner/QrCodeScanner'
import { SelectAssetRouter } from 'components/SelectAssets/SelectAssetRouter'
import { parseMaybeUrl } from 'lib/address/address'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectMarketDataById, selectSelectedCurrency } from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

import { useFormSend } from './hooks/useFormSend/useFormSend'
import { SendFormFields, SendRoutes } from './SendCommon'
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

type SendFormProps = {
  initialAssetId?: AssetId
  accountId?: AccountId
  input?: string
}

export const Form: React.FC<SendFormProps> = ({ initialAssetId, input = '', accountId }) => {
  const location = useLocation()
  const history = useHistory()
  const { handleFormSend } = useFormSend()
  const selectedCurrency = useAppSelector(selectSelectedCurrency)

  const [addressError, setAddressError] = useState<string | null>(null)

  const methods = useForm<SendInput>({
    mode: 'onChange',
    defaultValues: {
      accountId,
      to: '',
      input,
      vanityAddress: '',
      assetId: initialAssetId,
      feeType: FeeDataKey.Average,
      cryptoAmount: '',
      fiatAmount: '',
      fiatSymbol: selectedCurrency,
    },
  })

  const handleAssetSelect = useCallback(
    (assetId: AssetId) => {
      methods.setValue(SendFormFields.AssetId, assetId)
      methods.setValue(SendFormFields.AccountId, '')
      methods.setValue(SendFormFields.CryptoAmount, '')
      methods.setValue(SendFormFields.FiatAmount, '')
      methods.setValue(SendFormFields.FiatSymbol, selectedCurrency)

      history.push(SendRoutes.Address)
    },
    [history, methods, selectedCurrency],
  )

  const handleBack = useCallback(() => {
    setAddressError(null)
    history.goBack()
  }, [history])

  const checkKeyDown = useCallback((event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter') event.preventDefault()
  }, [])

  // The QR code scanning was succesful, doesn't mean the address itself is valid
  const handleQrSuccess = useCallback(
    async (decodedText: string) => {
      try {
        methods.setValue(SendFormFields.Input, decodedText.trim())

        const maybeUrlResult = await parseMaybeUrl({ urlOrAddress: decodedText })
        if (maybeUrlResult.assetId && maybeUrlResult.amountCryptoPrecision) {
          const marketData = selectMarketDataById(store.getState(), maybeUrlResult.assetId ?? '')
          methods.setValue(SendFormFields.CryptoAmount, maybeUrlResult.amountCryptoPrecision)
          methods.setValue(
            SendFormFields.FiatAmount,
            bnOrZero(maybeUrlResult.amountCryptoPrecision).times(marketData.price).toString(),
          )
        }

        history.push(SendRoutes.Address)
      } catch (e: any) {
        setAddressError(e.message)
      }
    },
    [history, methods],
  )

  useEffect(() => {
    if (!initialAssetId) {
      history.push(SendRoutes.Select)
    }
  }, [history, initialAssetId])

  return (
    <FormProvider {...methods}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <form onSubmit={methods.handleSubmit(handleFormSend)} onKeyDown={checkKeyDown}>
        <AnimatePresence exitBeforeEnter initial={false}>
          <Switch location={location} key={location.key}>
            <Route path={SendRoutes.Select}>
              <SelectAssetRouter onBack={handleBack} onClick={handleAssetSelect} />
            </Route>
            <Route path={SendRoutes.Address}>
              <Address />
            </Route>
            <Route path={SendRoutes.Details}>
              <Details />
            </Route>
            <Route path={SendRoutes.Scan}>
              <QrCodeScanner
                onSuccess={handleQrSuccess}
                onBack={handleBack}
                addressError={addressError}
              />
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
