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
import { useEffect, useMemo } from 'react'
import { IoMdCheckmark, IoMdClose } from 'react-icons/io'
import { LoadingBody } from 'components/LoadingBody'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { isMobile } from 'lib/globals'
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
  const consent = useMemo(() => VisitorDataManager.checkConsent(CONSENT_TAG), [CONSENT_TAG])

  useEffect(() => {
    if (!enabled) onContinue()
    // Auto launch if mobile or if they have consented
    if (consent || isMobile) {
      if (isMobile && !consent) {
        VisitorDataManager.recordConsent(CONSENT_TAG, true)
      }
      moduleLogger.trace({ consent }, 'User has selected their consent')
      launch()
      onContinue()
    }
  }, [CONSENT_TAG, consent, enabled, onContinue])

  const handleConfirm = async () => {
    moduleLogger.trace({ fn: 'handleConfirm' }, 'Confirmed')
    VisitorDataManager.recordConsent(CONSENT_TAG, true)
    // Duplicate logic as in the useEffect above but DON'T remove it
    // consent is not reactive and it won't update and do what you'd expect by moving the following lines in a useEffect()
    launch()
    onContinue()
  }

  return enabled ? (
    // If we haven't recorded user consent, <LoadingBody /> will render children
    // This looks wrong, but this route actually gets rendered once
    // If we have a consent, we push another route
    // Else, we also push another route, recording consent in case of mobile users
    <LoadingBody isLoaded={!consent}>
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
          width='full'
          colorScheme={'blue'}
          size='md'
          onClick={handleConfirm}
          data-test='consent-optin-continue-button'
        >
          <Text translation={'common.continue'} />
        </Button>
        <Button
          width='full'
          variant='ghost'
          size='md'
          mt={3}
          onClick={() => (window.location.href = 'https://private.shapeshift.com')}
          data-test='consent-optout-button'
        >
          <Text translation='plugins.analytics.optInModal.noThanks' />
        </Button>
      </ModalFooter>
    </LoadingBody>
  ) : null
}
