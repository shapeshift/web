import { Alert, AlertIcon, Button, ModalBody, ModalCloseButton, ModalFooter, ModalHeader } from '@chakra-ui/react'
import { Suspense } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

import { SendRoutes } from '../Send'

export const PermissionError = () => {
  const history = useHistory()
  const translate = useTranslate()

  return (
    <Suspense fallback={null}>
      <SlideTransition>
        <ModalHeader textAlign='center'>{translate('modals.send.scanQrCode')}</ModalHeader>
        <ModalCloseButton borderRadius='full' />
        <ModalBody>
          <Alert status='error'>
            <AlertIcon />
            <Text translation='modals.send.errors.qrPermissions' />
          </Alert>
        </ModalBody>
        <ModalFooter>
          <Button
            isFullWidth
            variant='ghost'
            size='lg'
            mr={3}
            onClick={() => history.push(SendRoutes.Address)}
          >
            <Text translation='common.cancel' />
          </Button>
        </ModalFooter>
      </SlideTransition>
    </Suspense>
  )
}
