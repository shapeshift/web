import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import type { FeeDataEstimate } from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Redirect, Route, Switch, useHistory, useLocation } from 'react-router-dom'
import { QrCodeScanner } from 'components/QrCodeScanner/QrCodeScanner'
import { SelectAssetRouter } from 'components/SelectAssets/SelectAssetRouter'
import { parseAddressInputWithChainId, parseMaybeUrl } from 'lib/address/address'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectMarketDataByAssetIdUserCurrency,
  selectSelectedCurrency,
} from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

import { useFormSend } from './hooks/useFormSend/useFormSend'
import { SendFormFields, SendRoutes } from './SendCommon'
import { Address } from './views/Address'
import { Confirm } from './views/Confirm'
import { Details } from './views/Details'
import { Status } from './views/Status'

export type SendInput<T extends ChainId = ChainId> = {
  [SendFormFields.AccountId]: AccountId
  [SendFormFields.To]: string
  [SendFormFields.From]: string
  [SendFormFields.AmountFieldError]: string | [string, { asset: string }]
  [SendFormFields.AssetId]: AssetId
  [SendFormFields.AmountCryptoPrecision]: string
  [SendFormFields.EstimatedFees]: FeeDataEstimate<T>
  [SendFormFields.FeeType]: FeeDataKey
  [SendFormFields.FiatAmount]: string
  [SendFormFields.FiatSymbol]: string
  [SendFormFields.Input]: string
  [SendFormFields.Memo]?: string
  [SendFormFields.SendMax]: boolean
  [SendFormFields.VanityAddress]: string
  [SendFormFields.CustomNonce]?: string
  [SendFormFields.TxHash]?: string
}

const formStyle = { height: '100%' }

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
      amountCryptoPrecision: '',
      fiatAmount: '',
      fiatSymbol: selectedCurrency,
      txHash: '',
    },
  })

  const handleSubmit = useCallback(
    async (data: SendInput) => {
      const txHash = await handleFormSend(data)
      if (!txHash) return
      methods.setValue(SendFormFields.TxHash, txHash)
      history.push(SendRoutes.Status)
    },
    [handleFormSend, history, methods],
  )

  const handleAssetSelect = useCallback(
    (assetId: AssetId) => {
      methods.setValue(SendFormFields.AssetId, assetId)
      methods.setValue(SendFormFields.AccountId, '')
      methods.setValue(SendFormFields.AmountCryptoPrecision, '')
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
        const maybeUrlResult = await parseMaybeUrl({ urlOrAddress: decodedText })

        const parseAddressInputWithChainIdArgs = {
          assetId: maybeUrlResult.assetId,
          chainId: maybeUrlResult.chainId,
          urlOrAddress: decodedText,
        }
        const { address } = await parseAddressInputWithChainId(parseAddressInputWithChainIdArgs)

        methods.setValue(SendFormFields.Input, address)

        if (maybeUrlResult.assetId && maybeUrlResult.amountCryptoPrecision) {
          const marketData = selectMarketDataByAssetIdUserCurrency(
            store.getState(),
            maybeUrlResult.assetId ?? '',
          )
          methods.setValue(
            SendFormFields.AmountCryptoPrecision,
            maybeUrlResult.amountCryptoPrecision,
          )
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
      <form
        style={formStyle}
        onSubmit={methods.handleSubmit(handleSubmit)}
        onKeyDown={checkKeyDown}
      >
        <AnimatePresence mode='wait' initial={false}>
          <Switch location={location} key={location.key}>
            <Route path={SendRoutes.Select}>
              <SelectAssetRouter onClick={handleAssetSelect} />
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
            <Route path={SendRoutes.Status}>
              <Status />
            </Route>
            <Redirect exact from='/' to={SendRoutes.Select} />
          </Switch>
        </AnimatePresence>
      </form>
    </FormProvider>
  )
}
