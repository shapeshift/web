import {
  Alert,
  AlertIcon,
  Button,
  Flex,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
} from '@chakra-ui/react'
import { lazy, Suspense, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

import type { SendInput } from '../Form'
import { SendFormFields, SendRoutes } from '../SendCommon'

const PERMISSION_ERROR = 'Permission denied'

const QrReader = lazy(() => import('react-qr-reader'))

export const QrCodeScanner = () => {
  const history = useHistory()
  const translate = useTranslate()
  const { setValue } = useFormContext<SendInput>()
  const [error, setError] = useState<DOMException | null>(null)

  const handleError = (error: DOMException) => {
    setError(error)
  }

  const handleScan = (value: string | null) => {
    if (value) {
      setValue(SendFormFields.Address, value)
      history.push(SendRoutes.Address)
    }
  }

  return (
    <Suspense fallback={null}>
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
                    error.message === PERMISSION_ERROR
                      ? 'modals.send.errors.qrPermissions'
                      : 'modals.send.errors.generic'
                  }
                />
              </Alert>
              {error.message === PERMISSION_ERROR && (
                <Button colorScheme='blue' mt='5' onClick={() => setError(null)}>
                  {translate('modals.send.permissionsButton')}
                </Button>
              )}
            </Flex>
          ) : (
            <QrReader
              delay={100}
              onError={handleError}
              onScan={handleScan}
              style={{ width: '100%', overflow: 'hidden', borderRadius: '1rem' }}
            />
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            isFullWidth
            variant='ghost'
            size='lg'
            onClick={() => history.push(SendRoutes.Address)}
          >
            <Text translation='common.back' />
          </Button>
        </ModalFooter>
      </SlideTransition>
    </Suspense>
  )
}
