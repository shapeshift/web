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
  QrcodeErrorCallback,
  QrcodeSuccessCallback,
} from 'html5-qrcode/cjs/core'
import { Html5QrcodeErrorTypes } from 'html5-qrcode/cjs/core'
import { useState } from 'react'
import { useController } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

import { SendFormFields, SendRoutes } from '../SendCommon'
import { QrCodeReader } from './QrCodeReader'

export type DOMExceptionCallback = (errorMessage: string) => void

const PERMISSION_ERROR = 'NotAllowedError : Permission denied'
const isPermissionError = (
  error: DOMException['message'] | Html5QrcodeError,
): error is DOMException['message'] =>
  typeof (error as DOMException['message']) === 'string' && error === PERMISSION_ERROR

export const QrCodeScanner = () => {
  const history = useHistory()
  const translate = useTranslate()
  const [error, setError] = useState<DOMException['message'] | null>(null)
  const {
    field: { onChange },
  } = useController({ name: SendFormFields.Input })

  const handleScanSuccess: QrcodeSuccessCallback = (decodedText, _result) => {
    onChange(decodedText.trim())
    history.push(SendRoutes.Address)
  }

  const handleScanError: QrcodeErrorCallback | DOMExceptionCallback = (_errorMessage, error) => {
    if (error?.type === Html5QrcodeErrorTypes.UNKWOWN_ERROR) {
      // https://github.com/mebjas/html5-qrcode/issues/320
      // 'NotFoundException: No MultiFormat Readers were able to detect the code' errors are thrown on every frame until a valid QR is detected, don't handle these
      return
    }

    setError(_errorMessage)
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
                    : 'modals.send.errors.generic'
                }
              />
            </Alert>
            {isPermissionError(error) && (
              <Button colorScheme='blue' mt='5' onClick={() => setError(null)}>
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
        <Button
          width='full'
          variant='ghost'
          size='lg'
          onClick={() => history.push(SendRoutes.Address)}
        >
          <Text translation='common.back' />
        </Button>
      </ModalFooter>
    </SlideTransition>
  )
}
