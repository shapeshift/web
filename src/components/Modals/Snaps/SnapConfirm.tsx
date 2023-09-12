import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Checkbox,
  Heading,
  ListItem,
  ModalBody,
  ModalFooter,
  ModalHeader,
  UnorderedList,
} from '@chakra-ui/react'
import React, { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { enableShapeShiftSnap } from 'utils/snaps'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { RawText } from 'components/Text'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'

type SnapConfirmProps = {
  onClose: () => void
}

export const SnapConfirm: React.FC<SnapConfirmProps> = ({ onClose }) => {
  const [isInstalling, setIsInstalling] = useState(false)
  const [hasAgreed, setHasAgreed] = useState(false)
  const [hasPinkySworeSeedPhraseIsBackedUp, setHasPinkySworeSeedPhraseIsBackedUp] = useState(false)
  const translate = useTranslate()
  const handleAddSnap = useCallback(() => {
    setIsInstalling(true)
    enableShapeShiftSnap()
    getMixPanel()?.track(MixPanelEvents.SnapInstalled)
  }, [])

  if (isInstalling) {
    return (
      <ModalBody
        display='flex'
        flexDir='column'
        gap={4}
        alignItems='center'
        justifyContent='center'
        py={6}
      >
        <CircularProgress />
        <Button variant='ghost' onClick={() => setIsInstalling(false)}>
          {translate('common.cancel')}
        </Button>
      </ModalBody>
    )
  }
  return (
    <>
      <ModalHeader textAlign='center'>
        <Heading as='h4'>Install Multichain Snap</Heading>
      </ModalHeader>
      <ModalBody>
        <Alert status='warning' borderRadius='lg' mb={4}>
          <AlertIcon />
          <AlertDescription>
            The ShapeShift Multichain Snap is a new, experimental feature, provided "as is"
          </AlertDescription>
        </Alert>
        <Alert status='error' borderRadius='lg' mb={4}>
          <AlertIcon />
          <AlertDescription>
            Ensure you have backed up your MetaMask seed phrase. Any funds you send to non-EVM
            chains using this Snap will be directed to the default account you set up with MetaMask.
          </AlertDescription>
        </Alert>
        <RawText fontWeight='bold'>Before continuing please read the following:</RawText>
        <UnorderedList spacing={2} my={4}>
          <ListItem>
            Hardware wallets are <strong>NOT</strong> supported
          </ListItem>
          <ListItem>
            Only Account #1 in MetaMask is supported for the extra chains the ShapeShift Multichain
            Snap provides{' '}
            <RawText as='span' color='text.subtle'>
              (Bitcoin, Bitcoin Cash, Litecoin, Dogecoin, THORChain, Cosmos)
            </RawText>
          </ListItem>
          <ListItem>
            To use the existing Ethereum chains provided by MetaMask, you must connect Account #1 to
            ShapeShift in MetaMask
          </ListItem>
          <ListItem>
            By enabling the ShapeShift Multichain Snap, you acknowledge you are using it at your own
            risk
          </ListItem>
        </UnorderedList>
        <Checkbox onChange={e => setHasAgreed(e.target.checked)} fontWeight='bold'>
          I have read and understand
        </Checkbox>
        <Checkbox
          onChange={e => setHasPinkySworeSeedPhraseIsBackedUp(e.target.checked)}
          fontWeight='bold'
        >
          I have backed up my MetaMask seed phrase
        </Checkbox>
      </ModalBody>
      <ModalFooter gap={2}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          colorScheme='blue'
          isDisabled={!(hasAgreed && hasPinkySworeSeedPhraseIsBackedUp)}
          onClick={handleAddSnap}
        >
          Confirm & Install
        </Button>
      </ModalFooter>
    </>
  )
}
