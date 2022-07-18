import {
  Button,
  Divider,
  List,
  ListIcon,
  ListItem,
  ModalBody,
  ModalFooter,
  useColorModeValue,
} from '@chakra-ui/react'
import { getConfig } from 'config'
import { launch } from 'plugins/pendo'
import { VisitorDataManager } from 'plugins/pendo/visitorData'
import { useCallback, useEffect } from 'react'
import { IoMdCheckmark, IoMdClose } from 'react-icons/io'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { logger } from 'lib/logger'

import { OptInIcon } from './OptInIcon'

const moduleLogger = logger.child({
  namespace: ['Plugins', 'Pendo', 'components', 'OptInModalBody'],
})

type OptInModalProps = {
  onContinue: () => void
}

export const OptInModalBody: React.FC<OptInModalProps> = ({ onContinue }) => {
  const enabled = useFeatureFlag('Pendo')

  const borderColor = useColorModeValue('gray.100', 'gray.750')

  const CONSENT_TAG = `pendo_${getConfig().REACT_APP_PENDO_CONSENT_VERSION}`
  const consent = VisitorDataManager.checkConsent(CONSENT_TAG)

  useEffect(() => {
    if (!enabled) onContinue()
    if (typeof consent === 'boolean') {
      moduleLogger.trace({ consent }, 'User has selected their consent')
      if (consent) launch()
      onContinue()
    }
  }, [consent, enabled, onContinue])

  const handleConfirm = useCallback(
    () => async () => {
      moduleLogger.trace({ fn: 'handleConfirm' }, 'Confirmed')
      VisitorDataManager.recordConsent(CONSENT_TAG, true)
      launch()
      onContinue()
    },
    [CONSENT_TAG, onContinue],
  )

  // If the user has already consented, we don't need to ask them again
  if (typeof consent === 'boolean') {
    return null
  }

  return enabled ? (
    <>
      <ModalBody py={8}>
        <OptInIcon mb={4} />
        <Text
          translation='plugins.analytics.optInModal.title'
          mb={2}
          fontWeight='bold'
          fontSize='xl'
        />
        <Text
          translation='plugins.analytics.optInModal.description'
          mb={4}
          color='gray.500'
          fontWeight='500'
          fontSize='sm'
        />
        <Text translation='plugins.analytics.optInModal.actionsSentence' mb={4} fontWeight='500' />

        <List borderRadius='xl' border={borderColor} borderWidth={'1px'}>
          <ListItem
            borderBottomWidth={'1px'}
            p={4}
            display='flex'
            justifyContent='space-between'
            alignItems='center'
            flexDirection='row'
          >
            <Text
              translation='plugins.analytics.optInModal.sendEvents'
              fontSize='sm'
              fontWeight='500'
            />
            <ListIcon as={IoMdCheckmark} mr={0} color='green.500' width='22px' height='22px' />
          </ListItem>
          <ListItem
            borderBottomWidth={'1px'}
            p={4}
            display='flex'
            justifyContent='space-between'
            alignItems='center'
            flexDirection='row'
          >
            <Text
              translation='plugins.analytics.optInModal.neverCollectPersonalInformations'
              fontSize='sm'
              fontWeight='500'
            />
            <ListIcon as={IoMdClose} mr={0} color='red.500' width='22px' height='22px' />
          </ListItem>
          <ListItem
            borderBottomWidth={'1px'}
            p={4}
            display='flex'
            justifyContent='space-between'
            alignItems='center'
            flexDirection='row'
          >
            <Text
              translation='plugins.analytics.optInModal.neverCollectIp'
              fontSize='sm'
              fontWeight='500'
            />
            <ListIcon as={IoMdClose} mr={0} color='red.500' width='22px' height='22px' />
          </ListItem>
          <ListItem
            p={4}
            display='flex'
            justifyContent='space-between'
            alignItems='center'
            flexDirection='row'
          >
            <Text
              translation='plugins.analytics.optInModal.neverSellData'
              fontSize='sm'
              fontWeight='500'
            />
            <ListIcon as={IoMdClose} mr={0} color='red.500' width='22px' height='22px' />
          </ListItem>
        </List>
      </ModalBody>

      <Divider mb={4} />

      <ModalFooter flexDirection='column'>
        <Button
          isFullWidth
          colorScheme={'blue'}
          size='md'
          onClick={handleConfirm}
          data-test='consent-optin-continue-button'
        >
          <Text translation={'common.continue'} />
        </Button>
        <Button
          isFullWidth
          variant='ghost'
          size='md'
          mt={3}
          onClick={() => (window.location.href = 'https://private.shapeshift.com')}
          data-test='consent-optout-button'
        >
          <Text translation='plugins.analytics.optInModal.noThanks' />
        </Button>
      </ModalFooter>
    </>
  ) : null
}
