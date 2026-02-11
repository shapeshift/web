import { useMediaQuery } from '@chakra-ui/react'
import { captureException } from '@sentry/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { isToken } from '@shapeshiftoss/utils'
import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'

import type { SendInput } from '../Send/Form'
import { useFormSend } from '../Send/hooks/useFormSend/useFormSend'
import { SendFormFields, SendRoutes } from '../Send/SendCommon'
import { Address } from '../Send/views/Address'
import { Confirm } from '../Send/views/Confirm'
import { Status } from '../Send/views/Status'

import { SendAmountDetails } from '@/components/Modals/Send/views/SendAmountDetails'
import { QrCodeScanner } from '@/components/QrCodeScanner/QrCodeScanner'
import { SelectAssetRouter } from '@/components/SelectAssets/SelectAssetRouter'
import { useModal } from '@/hooks/useModal/useModal'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { parseAddress, parseAddressInputWithChainId } from '@/lib/address/address'
import { parseUrlDirect } from '@/lib/address/bip21'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { isWalletConnectV2Uri } from '@/plugins/walletConnectToDapps/components/modals/connect/utils'
import { useWalletConnectV2 } from '@/plugins/walletConnectToDapps/WalletConnectV2Provider'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import {
  selectAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioAccountIdsByAssetIdFilter,
} from '@/state/slices/selectors'
import { store, useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

type QrCodeFormProps = {
  assetId?: AssetId
  accountId?: AccountId
}

const scanRedirect = <Navigate to={SendRoutes.Scan} replace />

const formStyle = { height: '100%' }

export const Form: React.FC<QrCodeFormProps> = ({ assetId: initialAssetId, accountId }) => {
  const navigate = useNavigate()
  const { handleFormSend } = useFormSend()
  const selectedCurrency = useAppSelector(preferences.selectors.selectSelectedCurrency)
  const [isSmallerThanMd] = useMediaQuery(`(max-width: ${breakpoints.md})`, { ssr: false })

  const [addressError, setAddressError] = useState<string | null>(null)
  const { close: handleClose } = useModal('qrCode')
  const { pair } = useWalletConnectV2()
  const translate = useTranslate()
  const toast = useNotificationToast({ desktopPosition: 'top-right' })

  const methods = useForm<SendInput>({
    mode: 'onChange',
    defaultValues: {
      accountId,
      to: '',
      vanityAddress: '',
      assetId: initialAssetId ?? '',
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

      if (isSmallerThanMd) {
        navigate(SendRoutes.Address)
        return
      }
      // On desktop, go directly to AmountDetails
      // On mobile, go to Address first
      navigate(SendRoutes.AmountDetails)
    },
    [methods, navigate, isSmallerThanMd],
  )

  const handleBack = useCallback(() => {
    setAddressError(null)
    navigate(SendRoutes.Scan)
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
          // If this is a WalletConnect dApp QR Code, skip the whole send logic and auto-pair directly.
          // There's no need for any RFC-3986 decoding here since we don't really care about parsing and WC will do that for us
          if (decodedText.startsWith('wc:')) {
            if (!isWalletConnectV2Uri(decodedText)) {
              setAddressError(translate('plugins.walletConnectToDapps.modal.connect.invalidUri'))
              return
            }
            try {
              await pair?.({ uri: decodedText })
              handleClose()
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : String(error)
              if (errorMessage.includes('Pairing already exists')) {
                toast({
                  title: translate('plugins.walletConnectToDapps.errors.errorConnectingToDapp'),
                  description: translate(
                    'plugins.walletConnectToDapps.errors.pairingAlreadyExists',
                  ),
                  status: 'error',
                  duration: 5000,
                  isClosable: true,
                })
              } else {
                captureException(error)
                toast({
                  title: translate('plugins.walletConnectToDapps.errors.errorConnectingToDapp'),
                  description: errorMessage,
                  status: 'error',
                  duration: 5000,
                  isClosable: true,
                })
              }
              handleClose()
            }
            return
          }

          // This should
          // - First attempt parsing as payment URI (BIP-21, ERC-681, Solana Pay) to extract address, amount, asset and chainId
          // - If no valid payment URI, fall back to plain address parsing by exhausting knownChainIds
          // - If there is a valid asset (i.e UTXO, or ETH, but not ERC-20s because they're unsafe), populates the asset and goes directly to the address step
          // If no valid asset is found, it should go to the select asset step
          const urlDirectResult = parseUrlDirect(decodedText)

          // Attempts parsing as payment URI first, otherwise defaults to address parsing
          // (finding assetId/chainId by exhausting knownChainIds)
          const maybeUrlResult = await (() => {
            if (urlDirectResult)
              return {
                assetId: urlDirectResult.assetId,
                chainId: urlDirectResult.chainId,
                value: decodedText,
                amountCryptoPrecision: urlDirectResult.amountCryptoPrecision,
              }
            return parseAddress({ address: decodedText })
          })()
          if (!maybeUrlResult.assetId) return

          const { address, vanityAddress } = urlDirectResult
            ? {
                address: urlDirectResult.maybeAddress,
                vanityAddress: urlDirectResult.maybeAddress,
              }
            : await parseAddressInputWithChainId({
                assetId: maybeUrlResult.assetId,
                chainId: maybeUrlResult.chainId,
                urlOrAddress: decodedText,
              })

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

          // Update accountId to match the scanned asset
          if (maybeUrlResult.assetId && !accountId) {
            // Get accounts for this asset to ensure we have a valid accountId
            const state = store.getState()
            const accountIds = selectPortfolioAccountIdsByAssetIdFilter(state, {
              assetId: maybeUrlResult.assetId,
            })
            const detectedAccountId = accountIds[0]

            // Only set accountId if one exists for this asset
            if (detectedAccountId) {
              methods.setValue(SendFormFields.AccountId, detectedAccountId)
            }
          }

          const { chainNamespace } = fromAssetId(maybeUrlResult.assetId)
          // i.e ERC-681 and Solana Pay for Solana, basically the exact same spec
          const supportsErc681 =
            chainNamespace === CHAIN_NAMESPACE.Evm || chainNamespace === CHAIN_NAMESPACE.Solana
          // Most wallets do not specify target_address on purpose for ERC-20 or Solana token transfers, as it's inherently unsafe
          // (although we have heuristics to make it safe)
          // Without an explicit token in the QR code, the resolved asset defaults to the native fee asset (e.g ETH),
          // which is ambiguous - the user may have intended to send a token on the same chain.
          // If we have page context (initialAssetId) on the same chain, use that; otherwise show the asset selector.
          const isAmbiguousTransfer = supportsErc681 && !isToken(maybeUrlResult.assetId)

          if (isAmbiguousTransfer) {
            if (initialAssetId) {
              const { chainId: contextChainId, chainNamespace: contextChainNamespace } =
                fromAssetId(initialAssetId)
              const { chainId: qrChainId } = fromAssetId(maybeUrlResult.assetId)
              const chainMatch = urlDirectResult
                ? contextChainId === qrChainId
                : contextChainNamespace === chainNamespace
              if (chainMatch) {
                methods.setValue(SendFormFields.AssetId, initialAssetId)
                if (initialAssetId !== maybeUrlResult.assetId) {
                  methods.setValue(SendFormFields.AmountCryptoPrecision, '')
                  methods.setValue(SendFormFields.FiatAmount, '')
                }
                const state = store.getState()
                const contextAccountIds = selectPortfolioAccountIdsByAssetIdFilter(state, {
                  assetId: initialAssetId,
                })
                if (contextAccountIds[0]) {
                  methods.setValue(SendFormFields.AccountId, contextAccountIds[0])
                }
                return navigate(SendRoutes.AmountDetails, { state: { isFromQrCode: true } })
              }
            }
            return navigate(SendRoutes.Select)
          }
          return navigate(SendRoutes.AmountDetails, { state: { isFromQrCode: true } })
        } catch (e: any) {
          setAddressError(e.message)
        }
      })()
    },
    [accountId, handleClose, initialAssetId, methods, navigate, pair, toast, translate],
  )

  const selectAssetRouterElement = useMemo(
    () => <SelectAssetRouter onBack={handleBack} onClick={handleAssetSelect} />,
    [handleBack, handleAssetSelect],
  )

  const addressElement = useMemo(() => <Address />, [])
  const detailsElement = useMemo(() => <SendAmountDetails />, [])
  const qrCodeScannerElement = useMemo(
    () => (
      <QrCodeScanner onSuccess={handleQrSuccess} onBack={handleClose} addressError={addressError} />
    ),
    [handleClose, handleQrSuccess, addressError],
  )
  const confirmElement = useMemo(
    () => <Confirm handleSubmit={methods.handleSubmit(handleSubmit)} />,
    [methods, handleSubmit],
  )
  const statusElement = useMemo(() => <Status />, [])

  return (
    <FormProvider {...methods}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <form
        onSubmit={methods.handleSubmit(handleSubmit)}
        onKeyDown={checkKeyDown}
        style={formStyle}
      >
        <AnimatePresence mode='wait' initial={false}>
          <Routes>
            <Route path={`${SendRoutes.Select}/*`} element={selectAssetRouterElement} />
            <Route path={SendRoutes.Address} element={addressElement} />
            <Route path={SendRoutes.AmountDetails} element={detailsElement} />
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
