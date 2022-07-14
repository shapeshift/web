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
import { Result } from '@zxing/library'
import { useMemo, useState } from 'react'
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
  const [error, setError] = useState<Error | null>(null)
  const {
    field: { onChange },
  } = useController({ name: SendFormFields.Input })

  const Scanner = useMemo(() => {
    const handleScan = (result: Result | undefined | null, error?: Error | undefined | null) => {
      if (error) {
        // setError(error)
        return
      }

      if (result) {
        onChange(result.getText().trim())
        history.push(SendRoutes.Address)
      }
    }
    return (
      <QrReader
        delay={100}
        onResult={handleScan}
        style={{ width: '100%', overflow: 'hidden', borderRadius: '1rem' }}
      />
    )
  }, [history, onChange])

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
          Scanner
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
