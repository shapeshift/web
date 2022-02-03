import { Button, ModalBody, ModalCloseButton, ModalFooter, ModalHeader } from '@chakra-ui/react'
import { lazy, Suspense } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

import { SendFormFields, SendInput } from '../Form'
import { SendRoutes } from '../Send'

const QrReader = lazy(() => import('react-qr-reader'))

export const QrCodeScanner = () => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const { setValue } = useFormContext<SendInput>()

  const handleError = () => {
    /** @todo render error to user */
    navigate(SendRoutes.Details)
  }

  const handleScan = (value: string | null) => {
    if (value) {
      setValue(SendFormFields.Address, value)
      navigate(SendRoutes.Address)
    }
  }

  return (
    <Suspense fallback={null}>
      <SlideTransition>
        <ModalHeader textAlign='center'>{translate('modals.send.scanQrCode')}</ModalHeader>
        <ModalCloseButton borderRadius='full' />
        <ModalBody>
          <QrReader
            delay={100}
            onError={handleError}
            onScan={handleScan}
            style={{ width: '100%', overflow: 'hidden', borderRadius: '1rem' }}
          />
        </ModalBody>
        <ModalFooter>
          <Button
            isFullWidth
            variant='ghost'
            size='lg'
            mr={3}
            onClick={() => navigate(SendRoutes.Address)}
          >
            <Text translation='common.cancel' />
          </Button>
        </ModalFooter>
      </SlideTransition>
    </Suspense>
  )
}
