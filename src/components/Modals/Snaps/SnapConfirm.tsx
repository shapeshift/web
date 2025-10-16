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
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { RawText, Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { useErrorToast } from '@/hooks/useErrorToast/useErrorToast'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { enableShapeShiftSnap } from '@/utils/snaps'

type SnapConfirmProps = {
  onClose: () => void
}

export const SnapConfirm: React.FC<SnapConfirmProps> = ({ onClose }) => {
  const { isSnapInstalled, isCorrectVersion } = useIsSnapInstalled()
  const [isInstalling, setIsInstalling] = useState(false)
  const [hasAgreed, setHasAgreed] = useState(false)
  const [hasPinkySworeSeedPhraseIsBackedUp, setHasPinkySworeSeedPhraseIsBackedUp] = useState(false)
  const translate = useTranslate()
  const { showErrorToast } = useErrorToast()
  const handleAddSnap = useCallback(async () => {
    try {
      setIsInstalling(true)
      await enableShapeShiftSnap()
      getMixPanel()?.track(MixPanelEvent.SnapInstalled)
      onClose()
    } catch (e) {
      setIsInstalling(false)
      showErrorToast(e, translate('walletProvider.metaMaskSnap.installError'))
    }
  }, [showErrorToast, onClose, translate])

  const handlePinkySwearSeedPhraseIsBackedUp = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setHasPinkySworeSeedPhraseIsBackedUp(event.target.checked),
    [],
  )

  const handleAgree = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setHasAgreed(event.target.checked),
    [],
  )

  // TODO: ackchually cancel, not use placebo
  const handleCancel = useCallback(() => setIsInstalling(false), [])

  const agreeItem1Components: TextPropTypes['components'] = useMemo(
    () => ({
      strong: <RawText as='strong' />,
    }),
    [],
  )

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
        {/* TODO: ackchually cancel, not use placebo - disabled for now */}
        <Button variant='ghost' isDisabled={true} onClick={handleCancel}>
          {translate('common.cancel')}
        </Button>
      </ModalBody>
    )
  }
  return (
    <>
      <ModalHeader textAlign='center'>
        <Heading as='h4'>
          {translate(
            isSnapInstalled && !isCorrectVersion
              ? 'walletProvider.metaMaskSnapConfirm.updateTitle'
              : 'walletProvider.metaMaskSnapConfirm.title',
          )}
        </Heading>
      </ModalHeader>
      <ModalBody>
        <Alert status='warning' borderRadius='lg' mb={4}>
          <AlertIcon />
          <AlertDescription>
            {translate('walletProvider.metaMaskSnapConfirm.warningExperimental')}
          </AlertDescription>
        </Alert>
        <Alert status='error' borderRadius='lg' mb={4}>
          <AlertIcon />
          <AlertDescription>
            {translate('walletProvider.metaMaskSnapConfirm.warningBackup')}
          </AlertDescription>
        </Alert>
        <RawText fontWeight='bold'>
          {translate('walletProvider.metaMaskSnapConfirm.agreeIntro')}
        </RawText>
        <UnorderedList spacing={2} my={4}>
          <ListItem>
            <Text
              translation='walletProvider.metaMaskSnapConfirm.agreeItem1'
              components={agreeItem1Components}
            />
          </ListItem>
          <ListItem>
            {translate('walletProvider.metaMaskSnapConfirm.agreeItem2')}{' '}
            <RawText as='span' color='text.subtle'>
              (Bitcoin, Bitcoin Cash, Litecoin, Dogecoin, THORChain, Cosmos)
            </RawText>
          </ListItem>
          <ListItem>{translate('walletProvider.metaMaskSnapConfirm.agreeItem3')}</ListItem>
          <ListItem>{translate('walletProvider.metaMaskSnapConfirm.agreeItem4')}</ListItem>
        </UnorderedList>
        <Checkbox onChange={handleAgree} fontWeight='bold'>
          {translate('walletProvider.metaMaskSnapConfirm.readAndUnderstood')}
        </Checkbox>
        <Checkbox onChange={handlePinkySwearSeedPhraseIsBackedUp} fontWeight='bold'>
          {translate('walletProvider.metaMaskSnapConfirm.seedBackedUp')}
        </Checkbox>
      </ModalBody>
      <ModalFooter gap={2}>
        <Button onClick={onClose}>{translate('common.cancel')}</Button>
        <Button
          colorScheme='blue'
          isDisabled={!(hasAgreed && hasPinkySworeSeedPhraseIsBackedUp)}
          onClick={handleAddSnap}
        >
          {translate(
            isSnapInstalled && !isCorrectVersion
              ? 'walletProvider.metaMaskSnapConfirm.acceptUpdate'
              : 'walletProvider.metaMaskSnapConfirm.acceptInstall',
          )}
        </Button>
      </ModalFooter>
    </>
  )
}
