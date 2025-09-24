import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { isToken } from '@shapeshiftoss/utils'
import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { parseUrlDirect } from '@/lib/address/bip21'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { ConnectModal } from '@/plugins/walletConnectToDapps/components/modals/connect/Connect'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { store, useAppSelector } from '@/state/store'

type QrCodeFormProps = {
  assetId?: AssetId
  accountId?: AccountId
}

const scanRedirect = <Navigate to={SendRoutes.Scan} replace />

export const Form: React.FC<QrCodeFormProps> = ({ accountId }) => {
  const navigate = useNavigate()
  const { handleFormSend } = useFormSend()
  const selectedCurrency = useAppSelector(preferences.selectors.selectSelectedCurrency)

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

  useEffect(() => {
    navigate(SendRoutes.Scan)
    // Do not add navigate as a dep here or problems
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAssetSelect = useCallback(
    (assetId: AssetId) => {
      const asset = selectAssetById(store.getState(), assetId ?? '')
      // This should never happen, but tsc
      if (!asset) return
      methods.setValue(SendFormFields.AssetId, asset.assetId)

      navigate(SendRoutes.Address)
    },
    [methods, navigate],
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
    [handleFormSend, methods, navigate],
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

          // Try parsing as payment URI first, otherwise use legacy address parser
          const urlDirectResult = parseUrlDirect(decodedText)

          const maybeUrlResult = (() => {
            if (urlDirectResult) {
              // Convert to legacy format
              return {
                assetId: urlDirectResult.assetId,
                chainId: urlDirectResult.chainId,
                value: decodedText,
                amountCryptoPrecision: urlDirectResult.amountCryptoPrecision,
              }
            } else {
              // Use legacy parser for plain addresses
              return parseMaybeUrl({ urlOrAddress: decodedText })
            }
          })()

          if (!maybeUrlResult.assetId) return

          // Get validated address and vanity address
          const { address, vanityAddress } = await (async () => {
            if (urlDirectResult) {
              // For URLs, we already have the validated address and asset
              return {
                address: urlDirectResult.maybeAddress,
                vanityAddress: urlDirectResult.maybeAddress, // No vanity resolution needed for URLs
              }
            } else {
              // For plain addresses, use the full validation process
              const parseAddressInputWithChainIdArgs = {
                assetId: maybeUrlResult.assetId,
                chainId: maybeUrlResult.chainId,
                urlOrAddress: decodedText,
              }
              const result = await parseAddressInputWithChainId(parseAddressInputWithChainIdArgs)
              return {
                address: result.address,
                vanityAddress: result.vanityAddress,
              }
            }
          })()

          methods.setValue(SendFormFields.AssetId, maybeUrlResult.assetId ?? '')
          methods.setValue(SendFormFields.Input, address)
          methods.setValue(SendFormFields.To, address)
          methods.setValue(SendFormFields.VanityAddress, vanityAddress)

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
              bnOrZero(maybeUrlResult.amountCryptoPrecision)
                .times(bnOrZero(marketData?.price))
                .toString(),
            )
          }

          const { chainNamespace } = fromAssetId(maybeUrlResult.assetId)
          // i.e ERC-681 and Solana Pay for Solana, basically the exact same spec
          const supportsErc681 =
            chainNamespace === CHAIN_NAMESPACE.Evm || chainNamespace === CHAIN_NAMESPACE.Solana
          // Most wallets do not specify target_address on purpose for ERC-20 or Solana token transfers, as it's inherently unsafe
          // (although we have heuristics to make it safe)
          // For the purpose of being spec compliant, we assume that if there was an `amount` field, that means native amount (which it should, according to the spec)
          // And we then assume native asset transfer as a result - users can always change asset in the amount screen if that was wrong
          // However, if not asset AND no amount are specific, we don't assume anything, and let em select the asset manually
          const isAmbiguousTransfer =
            supportsErc681 &&
            !isToken(maybeUrlResult.assetId) &&
            !maybeUrlResult.amountCryptoPrecision

          if (isAmbiguousTransfer) {
            return navigate(SendRoutes.Select)
          }
          return navigate(SendRoutes.Details)
        } catch (e: any) {
          setAddressError(e.message)
        }
      })()
    },
    [methods, navigate],
  )

  const selectAssetRouterElement = useMemo(
    () => <SelectAssetRouter onBack={handleBack} onClick={handleAssetSelect} />,
    [handleBack, handleAssetSelect],
  )

  const addressElement = useMemo(() => <Address />, [])
  const detailsElement = useMemo(() => <Details />, [])
  const qrCodeScannerElement = useMemo(
    () => (
      <QrCodeScanner onSuccess={handleQrSuccess} onBack={handleClose} addressError={addressError} />
    ),
    [handleClose, handleQrSuccess, addressError],
  )
  const confirmElement = useMemo(() => <Confirm />, [])
  const statusElement = useMemo(() => <Status />, [])

  if (walletConnectDappUrl)
    return <ConnectModal initialUri={walletConnectDappUrl} isOpen={isOpen} onClose={handleClose} />

  return (
    <FormProvider {...methods}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <form onSubmit={methods.handleSubmit(handleSubmit)} onKeyDown={checkKeyDown}>
        <AnimatePresence mode='wait' initial={false}>
          <Routes>
            <Route path={`${SendRoutes.Select}/*`} element={selectAssetRouterElement} />
            <Route path={SendRoutes.Address} element={addressElement} />
            <Route path={SendRoutes.Details} element={detailsElement} />
            <Route path={SendRoutes.Scan} element={qrCodeScannerElement} />
            <Route path={SendRoutes.Confirm} element={confirmElement} />
            <Route path={SendRoutes.Status} element={statusElement} />
            <Route path='/' element={scanRedirect} />
          </Routes>
        </AnimatePresence>
      </form>
    </FormProvider>
  )
}
