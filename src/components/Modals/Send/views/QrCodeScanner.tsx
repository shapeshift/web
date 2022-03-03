import {
  Alert,
  AlertIcon,
  Button,
  Flex,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  ModalHeader
} from '@chakra-ui/react'
import {lazy, Suspense, useState} from 'react'
import {useFormContext} from 'react-hook-form'
import {useTranslate} from 'react-polyglot'
import {useHistory} from 'react-router-dom'
import {SlideTransition} from 'components/SlideTransition'
import {Text} from 'components/Text'

import {SendFormFields, SendInput} from '../Form'
import {SendRoutes} from '../Send'

const PermissionError = 'Permission denied'

enum ErrorMessages {
  permissions = 'modals.send.errors.qrPermissions',
  generic = 'modals.send.errors.generic'
}

const QrReader = lazy(() => import('react-qr-reader'))

export const QrCodeScanner = () => {
  const history = useHistory()
  const translate = useTranslate()
  const {setValue} = useFormContext<SendInput>()
  const [hasError, setError] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>()

  const handleError = (error: DOMException) => {
    setError(true)

    if (error.message === PermissionError) {
      setErrorMessage(ErrorMessages.permissions)
    } else {
      setErrorMessage(ErrorMessages.generic)
    }
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
          {hasError && errorMessage ? (
            <Flex justifyContent='center' alignItems='center' flexDirection='column'>
              <Alert status='error' borderRadius='xl'>
                <AlertIcon />
                <Text translation={errorMessage} />
              </Alert>
              {errorMessage === ErrorMessages.permissions && (
                <Button colorScheme='green' mt='5' size='sm' onClick={() => setError(false)}>
                  {translate('modals.send.permissionsButton')}
                </Button>
              )}
            </Flex>
          ) : (
            <QrReader
              delay={100}
              onError={handleError}
              onScan={handleScan}
              style={{width: '100%', overflow: 'hidden', borderRadius: '1rem'}}
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
