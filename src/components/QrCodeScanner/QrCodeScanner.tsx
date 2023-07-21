import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
} from '@chakra-ui/react'
import type {
  Html5QrcodeError,
  Html5QrcodeResult,
  QrcodeErrorCallback,
  QrcodeSuccessCallback,
} from 'html5-qrcode/cjs/core'
import { Html5QrcodeErrorTypes } from 'html5-qrcode/cjs/core'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

import { QrCodeReader } from './QrCodeReader'

export type DOMExceptionCallback = (errorMessage: string) => void

const PERMISSION_ERROR = 'NotAllowedError : Permission denied'
const isPermissionError = (
  error: DOMException['message'] | Html5QrcodeError,
): error is DOMException['message'] =>
  typeof (error as DOMException['message']) === 'string' && error === PERMISSION_ERROR

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

  const error = addressError ?? scanError

  const handleScanSuccess: QrcodeSuccessCallback = (decodedText, _result) => {
    onSuccess(decodedText, _result)
  }

  const handleScanError: QrcodeErrorCallback | DOMExceptionCallback = (_errorMessage, error) => {
    if (error?.type === Html5QrcodeErrorTypes.UNKWOWN_ERROR) {
      // https://github.com/mebjas/html5-qrcode/issues/320
      // 'NotFoundException: No MultiFormat Readers were able to detect the code' errors are thrown on every frame until a valid QR is detected, don't handle these
      return
    }

    setScanError(_errorMessage)
    if (onError) onError(_errorMessage, error)
  }

  return (
    <SlideTransition>
      <ModalHeader textAlign='center'>{translate('modals.send.scanQrCode')}</ModalHeader>
      <ModalCloseButton borderRadius='full' />
      <ModalBody>
        {error ? (
          <Flex justifyContent='center' alignItems='center' flexDirection='column'>
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
              <Button colorScheme='blue' mt='5' onClick={() => setScanError(null)}>
                {translate('modals.send.permissionsButton')}
              </Button>
            )}
          </Flex>
        ) : (
          <Box
            style={{ width: '100%', minHeight: '298px', overflow: 'hidden', borderRadius: '1rem' }}
          >
            <QrCodeReader
              qrbox={{ width: 250, height: 250 }}
              fps={10}
              qrCodeSuccessCallback={handleScanSuccess}
              qrCodeErrorCallback={handleScanError}
            />
          </Box>
        )}
      </ModalBody>
      <ModalFooter>
        <Button width='full' variant='ghost' size='lg' onClick={onBack}>
          <Text translation='common.back' />
        </Button>
      </ModalFooter>
    </SlideTransition>
  )
}
