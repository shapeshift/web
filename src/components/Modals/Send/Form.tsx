import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import type { FeeDataEstimate } from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { AnimatePresence } from 'framer-motion'
import { useCallback, useMemo, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import { useFormSend } from './hooks/useFormSend/useFormSend'
import { SendFormFields, SendRoutes } from './SendCommon'
import { Address } from './views/Address'
import { Confirm } from './views/Confirm'
import { Details } from './views/Details'
import { Status } from './views/Status'

import { QrCodeScanner } from '@/components/QrCodeScanner/QrCodeScanner'
import { SelectAssetRouter } from '@/components/SelectAssets/SelectAssetRouter'
import { SlideTransition } from '@/components/SlideTransition'
import { parseAddressInputWithChainId, parseMaybeUrl } from '@/lib/address/address'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { store, useAppSelector } from '@/state/store'

const status = <Status />
const confirm = <Confirm />
const details = <Details />
const address = <Address />

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

const selectRedirect = <Navigate to={SendRoutes.Select} replace />

export const Form: React.FC<SendFormProps> = ({ initialAssetId, input = '', accountId }) => {
  const navigate = useNavigate()
  const { handleFormSend } = useFormSend()
  const mixpanel = getMixPanel()
  const selectedCurrency = useAppSelector(preferences.selectors.selectSelectedCurrency)

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
  const assetId = useWatch<SendInput, SendFormFields.AssetId>({
    name: SendFormFields.AssetId,
    control: methods.control,
  })

  const handleSubmit = useCallback(
    async (data: SendInput) => {
      const txHash = await handleFormSend(data, false)
      if (!txHash) return
      mixpanel?.track(MixPanelEvent.SendBroadcast)
      methods.setValue(SendFormFields.TxHash, txHash)
      navigate(SendRoutes.Status)
    },
    [handleFormSend, navigate, methods, mixpanel],
  )

  const handleAssetSelect = useCallback(
    (assetId: AssetId) => {
      // Set all form values
      methods.setValue(SendFormFields.AssetId, assetId)
      methods.setValue(SendFormFields.AccountId, '')
      methods.setValue(SendFormFields.AmountCryptoPrecision, '')
      methods.setValue(SendFormFields.FiatAmount, '')
      methods.setValue(SendFormFields.FiatSymbol, selectedCurrency)

      // Use requestAnimationFrame to ensure navigation happens after state updates
      requestAnimationFrame(() => {
        navigate(SendRoutes.Address, { replace: true })
      })
    },
    [navigate, methods, selectedCurrency],
  )

  const handleBack = useCallback(() => {
    setAddressError(null)
    navigate(-1)
  }, [navigate])

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
            bnOrZero(maybeUrlResult.amountCryptoPrecision)
              .times(bnOrZero(marketData?.price))
              .toString(),
          )
        }

        navigate(SendRoutes.Address)
      } catch (e: any) {
        setAddressError(e.message)
      }
    },
    [navigate, methods],
  )

  const qrCodeScanner = useMemo(
    () => (
      <QrCodeScanner onSuccess={handleQrSuccess} onBack={handleBack} addressError={addressError} />
    ),
    [addressError, handleBack, handleQrSuccess],
  )

  const selectAssetRouter = useMemo(
    () => <SelectAssetRouter onClick={handleAssetSelect} />,
    [handleAssetSelect],
  )

  const location = useLocation()

  return (
    <FormProvider {...methods}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <form
        style={formStyle}
        onSubmit={methods.handleSubmit(handleSubmit)}
        onKeyDown={checkKeyDown}
      >
        <AnimatePresence mode='wait' initial={false}>
          {/* Instead of a redirect which would produce a flash of content, we simply render the select route in place of <Switch />ing here */}
          {!initialAssetId && !assetId ? (
            <SlideTransition className='flex flex-col h-full'>{selectAssetRouter}</SlideTransition>
          ) : (
            <Switch location={location.pathname}>
              <Route path={SendRoutes.Select}>{selectAssetRouter}</Route>
              <Route path={SendRoutes.Address}>{address}</Route>
              <Route path={SendRoutes.Details}> {details}</Route>
              <Route path={SendRoutes.Scan}>{qrCodeScanner}</Route>
              <Route path={SendRoutes.Confirm}>{confirm}</Route>
              <Route path={SendRoutes.Status}>{status}</Route>
              <Route path='/'>{selectRedirect}</Route>
            </Switch>
          )}
        </AnimatePresence>
      </form>
    </FormProvider>
  )
}
