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
import { useState } from 'react'
import { useController } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { QrReader } from 'react-qr-reader'
import { useHistory } from 'react-router-dom'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

import { SendFormFields, SendRoutes } from '../SendCommon'

const PERMISSION_ERROR = 'Permission denied'

export const QrCodeScanner = () => {
  const history = useHistory()
  const translate = useTranslate()
  const [error, setError] = useState<DOMException | null>(null)
  const {
    field: { onChange },
  } = useController({ name: SendFormFields.Input })

  const handleError = (error: DOMException) => {
    setError(error)
  }

  const handleScan = async (value: string | null) => {
    if (value) {
      onChange(value.trim())

      history.push(SendRoutes.Address)
    }
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
