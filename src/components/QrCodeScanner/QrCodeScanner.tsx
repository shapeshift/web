import { Alert, AlertIcon, Box, Button, Center, Flex, Spinner } from '@chakra-ui/react'
import type {
  Html5QrcodeError,
  Html5QrcodeResult,
  QrcodeErrorCallback,
  QrcodeSuccessCallback,
} from 'html5-qrcode/cjs/core'
import { Html5QrcodeErrorTypes } from 'html5-qrcode/cjs/core'
import { useCallback, useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { DialogBackButton } from '../Modal/components/DialogBackButton'
import { QrCodeReader } from './QrCodeReader'

import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { SlideTransition } from '@/components/SlideTransition'
import { Text } from '@/components/Text'
import { openNativeQRScanner } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { isMobile } from '@/lib/globals'

export type DOMExceptionCallback = (errorMessage: string) => void

const PERMISSION_ERROR = 'NotAllowedError : Permission denied'
const isPermissionError = (
  error: DOMException['message'] | Html5QrcodeError,
): error is DOMException['message'] =>
  typeof (error as DOMException['message']) === 'string' && error === PERMISSION_ERROR

const boxStyle = {
  width: '100%',
  minHeight: '298px',
  overflow: 'hidden',
  borderRadius: '1rem',
}
const qrBoxStyle = { width: 250, height: 250 }

export const QrCodeScanner = ({
  onSuccess,
  onBack,
  onError,
  addressError,
}: {
  onSuccess: (decodedText: string, result: Html5QrcodeResult) => void
  onBack: () => void
  onError?: (errorMessage: string, error: Html5QrcodeError) => void
  addressError?: string | null
}) => {
  const translate = useTranslate()
  const [scanError, setScanError] = useState<DOMException['message'] | null>(null)
  const [isNativeScannerLoading, setIsNativeScannerLoading] = useState(isMobile)

  const error = addressError ?? scanError

  // Use native scanner when in mobile app
  useEffect(() => {
    if (!isMobile) return

    setIsNativeScannerLoading(true)

    openNativeQRScanner()
      .then(data => {
        // Create a minimal result object for compatibility
        const mockResult = { decodedText: data } as Html5QrcodeResult
        onSuccess(data, mockResult)
      })
      .catch(e => {
        setIsNativeScannerLoading(false)
        if (e.message === 'QR scan cancelled') {
          onBack()
        } else {
          setScanError(e.message)
          if (onError) {
            onError(e.message, { type: Html5QrcodeErrorTypes.UNKWOWN_ERROR } as Html5QrcodeError)
          }
        }
      })
  }, [onSuccess, onBack, onError])

  const handleScanSuccess: QrcodeSuccessCallback = useCallback(
    (decodedText, _result) => {
      onSuccess(decodedText, _result)
    },
    [onSuccess],
  )

  const handleScanError: QrcodeErrorCallback | DOMExceptionCallback = useCallback(
    (_errorMessage, error) => {
      if (error?.type === Html5QrcodeErrorTypes.UNKWOWN_ERROR) {
        // https://github.com/mebjas/html5-qrcode/issues/320
        // 'NotFoundException: No MultiFormat Readers were able to detect the code' errors are thrown on every frame until a valid QR is detected, don't handle these
        return
      }

      setScanError(_errorMessage)
      if (onError) onError(_errorMessage, error)
    },
    [onError],
  )

  const handlePermissionsButtonClick = useCallback(() => setScanError(null), [])

  // Show loading state while waiting for native scanner
  if (isMobile && isNativeScannerLoading) {
    return (
      <SlideTransition>
        <DialogHeader>
          <DialogHeader.Left>
            <DialogBackButton onClick={onBack} />
          </DialogHeader.Left>
          <DialogHeader.Middle>
            <DialogTitle>{translate('modals.send.scanQrCode')}</DialogTitle>
          </DialogHeader.Middle>
        </DialogHeader>
        <DialogBody>
          <Center minHeight='298px'>
            <Spinner size='xl' color='blue.500' />
          </Center>
        </DialogBody>
      </SlideTransition>
    )
  }

  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeader.Left>
          <DialogBackButton onClick={onBack} />
        </DialogHeader.Left>
        <DialogHeader.Middle>
          <DialogTitle>{translate('modals.send.scanQrCode')}</DialogTitle>
        </DialogHeader.Middle>
      </DialogHeader>
      <DialogBody>
        {error ? (
          <Flex justifyContent='center' alignItems='center' flexDirection='column' pb={4}>
            <Alert status='error' borderRadius='xl'>
              <AlertIcon />
              <Text
                translation={
                  isPermissionError(error)
                    ? 'modals.send.errors.qrPermissions'
                    : addressError ?? 'modals.send.errors.generic'
                }
              />
            </Alert>
            {isPermissionError(error) && (
              <Button colorScheme='blue' mt='5' onClick={handlePermissionsButtonClick}>
                {translate('modals.send.permissionsButton')}
              </Button>
            )}
          </Flex>
        ) : (
          <Box style={boxStyle}>
            <QrCodeReader
              qrbox={qrBoxStyle}
              fps={10}
              qrCodeSuccessCallback={handleScanSuccess}
              qrCodeErrorCallback={handleScanError}
            />
          </Box>
        )}
      </DialogBody>
    </SlideTransition>
  )
}
