import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import type { FeeDataEstimate } from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { useFormSend } from './hooks/useFormSend/useFormSend'
import { SendFormFields, SendRoutes } from './SendCommon'
import { Address } from './views/Address'
import { Confirm } from './views/Confirm'
import { Details } from './views/Details'
import { Status } from './views/Status'

import { QrCodeScanner } from '@/components/QrCodeScanner/QrCodeScanner'
import { SelectAssetRouter } from '@/components/SelectAssets/SelectAssetRouter'
import { parseAddressInputWithChainId, parseMaybeUrl } from '@/lib/address/address'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import {
  selectMarketDataByAssetIdUserCurrency,
  selectSelectedCurrency,
} from '@/state/slices/selectors'
import { store, useAppSelector } from '@/state/store'

const SelectRedirect = () => <Navigate to={SendRoutes.Select} replace />

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
  const navigate = useNavigate()
  const { handleFormSend } = useFormSend()
  const mixpanel = getMixPanel()
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
    async (_: SendInput) => {
      mixpanel?.track(MixPanelEvent.SendFormSubmit)
      await handleFormSend()
      navigate(SendRoutes.Status)
    },
    [handleFormSend, mixpanel, navigate],
  )

  const handleAssetSelect = useCallback(
    (asset: Asset, account: Account) => {
      mixpanel?.track(MixPanelEvent.SendAssetSelected)
      methods.setValue(SendFormFields.AccountId, account?.id ?? '')
      methods.setValue(SendFormFields.AssetId, asset.assetId)
      methods.setValue(SendFormFields.FiatSymbol, asset.symbol)
      navigate(SendRoutes.Address)
    },
    [methods, mixpanel, navigate],
  )

  const handleBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  const checkKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLFormElement>) => {
      if (e.key === 'Enter' && location.pathname === SendRoutes.Address) {
        mixpanel?.track(MixPanelEvent.SendEnterAddress)
        navigate(SendRoutes.Details)
        e.preventDefault()
      }
    },
    [location.pathname, mixpanel, navigate],
  )

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
        methods.setValue(SendFormFields.VanityAddress, address)

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

        navigate(SendRoutes.Address)
      } catch (e: any) {
        setAddressError(e.message)
      }
    },
    [methods, navigate],
  )

  useEffect(() => {
    if (!initialAssetId) {
      navigate(SendRoutes.Select)
    }
  }, [navigate, initialAssetId])

  return (
    <FormProvider {...methods}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <form
        style={formStyle}
        onSubmit={methods.handleSubmit(handleSubmit)}
        onKeyDown={checkKeyDown}
      >
        <AnimatePresence mode='wait' initial={false}>
          <Routes>
            <Route
              path={SendRoutes.Select}
              element={<SelectAssetRouter onClick={handleAssetSelect} />}
            />
            <Route path={SendRoutes.Address} element={<Address />} />
            <Route path={SendRoutes.Details} element={<Details />} />
            <Route
              path={SendRoutes.Scan}
              element={
                <QrCodeScanner
                  onSuccess={handleQrSuccess}
                  onBack={handleBack}
                  addressError={addressError}
                />
              }
            />
            <Route path={SendRoutes.Confirm} element={<Confirm />} />
            <Route path={SendRoutes.Status} element={<Status />} />
            <Route path='/' element={<SelectRedirect />} />
          </Routes>
        </AnimatePresence>
      </form>
    </FormProvider>
  )
}
