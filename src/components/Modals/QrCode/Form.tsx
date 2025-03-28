import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'

import type { SendInput } from '../Send/Form'
import { useFormSend } from '../Send/hooks/useFormSend/useFormSend'
import { SendFormFields, SendRoutes } from '../Send/SendCommon'
import { Address } from '../Send/views/Address'
import { Confirm } from '../Send/views/Confirm'
import { Details } from '../Send/views/Details'
import { Status } from '../Send/views/Status'

import { QrCodeScanner } from '@/components/QrCodeScanner/QrCodeScanner'
import { SelectAssetRouter } from '@/components/SelectAssets/SelectAssetRouter'
import { useModal } from '@/hooks/useModal/useModal'
import { parseAddressInputWithChainId, parseMaybeUrl } from '@/lib/address/address'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { ConnectModal } from '@/plugins/walletConnectToDapps/components/modals/connect/Connect'
import {
  selectAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectSelectedCurrency,
} from '@/state/slices/selectors'
import { store, useAppSelector } from '@/state/store'

type QrCodeFormProps = {
  assetId?: AssetId
  accountId?: AccountId
}

const ScanRedirect = () => <Navigate to={SendRoutes.Scan} replace />

export const Form: React.FC<QrCodeFormProps> = ({ accountId }) => {
  const navigate = useNavigate()
  const { handleFormSend } = useFormSend()
  const selectedCurrency = useAppSelector(selectSelectedCurrency)

  const [addressError, setAddressError] = useState<string | null>(null)
  const { isOpen, close: handleClose } = useModal('qrCode')
  const [walletConnectDappUrl, setWalletConnectDappUrl] = useState('')

  const methods = useForm<SendInput>({
    mode: 'onChange',
    defaultValues: {
      accountId,
      to: '',
      vanityAddress: '',
      assetId: '',
      feeType: FeeDataKey.Average,
      amountCryptoPrecision: '',
      fiatAmount: '',
      fiatSymbol: selectedCurrency,
    },
  })

  const handleAssetSelect = useCallback(
    (assetId: AssetId) => {
      const asset = selectAssetById(store.getState(), assetId ?? '')
      // This should never happen, but tsc
      if (!asset) return
      methods.setValue(SendFormFields.AssetId, asset.assetId)

      navigate(SendRoutes.Address)
    },
    [navigate, methods],
  )

  const handleBack = useCallback(() => {
    setAddressError(null)
    navigate(-1)
  }, [navigate])

  const handleSubmit = useCallback(
    async (data: SendInput) => {
      const txHash = await handleFormSend(data, false)
      if (!txHash) return
      methods.setValue(SendFormFields.TxHash, txHash)
      navigate(SendRoutes.Status)
    },
    [handleFormSend, navigate, methods],
  )

  const checkKeyDown = useCallback((event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter') event.preventDefault()
  }, [])

  // The QR code scanning was succesful, doesn't mean the address itself is valid
  const handleQrSuccess = useCallback(
    (decodedText: string) => {
      ;(async () => {
        try {
          // If this is a WalletConnect dApp QR Code, skip the whole send logic and render the QR Code Modal instead.
          // There's no need for any RFC-3986 decoding here since we don't really care about parsing and WC will do that for us
          if (decodedText.startsWith('wc:')) return setWalletConnectDappUrl(decodedText)

          // This should
          // - Parse the address, amount and asset. This should also exhaust URI parsers (EVM and UTXO currently) and set the amount/asset if applicable
          // - If there is a valid asset (i.e UTXO, or ETH, but not ERC-20s because they're unsafe), populates the asset and goes directly to the address step
          // If no valid asset is found, it should go to the select asset step
          const maybeUrlResult = await parseMaybeUrl({ urlOrAddress: decodedText })

          if (!maybeUrlResult.assetId) return

          const parseAddressInputWithChainIdArgs = {
            assetId: maybeUrlResult.assetId,
            chainId: maybeUrlResult.chainId,
            urlOrAddress: decodedText,
          }
          const { address } = await parseAddressInputWithChainId(parseAddressInputWithChainIdArgs)

          methods.setValue(SendFormFields.AssetId, maybeUrlResult.assetId ?? '')
          methods.setValue(SendFormFields.Input, address)
          methods.setValue(SendFormFields.AssetId, maybeUrlResult.assetId ?? '')
          if (maybeUrlResult.amountCryptoPrecision) {
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

          // We don't parse EIP-681 URLs because they're unsafe
          // Some wallets may be smart, like Trust just showing an address as a QR code to avoid dangerously unsafe parameters
          // Others might do dangerous tricks in the way they represent an asset, using various parameters to do so
          // There's also the fact that we will assume the AssetId to be the native one of the first chain we managed to validate the address
          // Which may not be the chain the user wants to send, or they may want to send a token - so we should always ask the user to select the asset
          if (maybeUrlResult.assetId === ethAssetId) return navigate(SendRoutes.Select)
          navigate(SendRoutes.Address)
        } catch (e: any) {
          setAddressError(e.message)
        }
      })()
    },
    [navigate, methods],
  )

  useEffect(() => {
    navigate(SendRoutes.Scan)
  }, [navigate])

  if (walletConnectDappUrl)
    return <ConnectModal initialUri={walletConnectDappUrl} isOpen={isOpen} onClose={handleClose} />

  return (
    <FormProvider {...methods}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <form onSubmit={methods.handleSubmit(handleSubmit)} onKeyDown={checkKeyDown}>
        <AnimatePresence mode='wait' initial={false}>
          <Routes>
            <Route
              path={`${SendRoutes.Select}/*`}
              element={<SelectAssetRouter onBack={handleBack} onClick={handleAssetSelect} />}
            />
            <Route path={SendRoutes.Address} element={<Address />} />
            <Route path={SendRoutes.Details} element={<Details />} />
            <Route
              path={SendRoutes.Scan}
              element={
                <QrCodeScanner
                  onSuccess={handleQrSuccess}
                  onBack={handleClose}
                  addressError={addressError}
                />
              }
            />
            <Route path={SendRoutes.Confirm} element={<Confirm />} />
            <Route path={SendRoutes.Status} element={<Status />} />
            <Route path='/' element={<ScanRedirect />} />
          </Routes>
        </AnimatePresence>
      </form>
    </FormProvider>
  )
}
