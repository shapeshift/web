import {
  Button,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Flex
} from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import React, { useEffect, useState } from 'react'
import KeepKeyConnect from 'assets/hold-and-connect.svg'
import KeepKeyRelease from 'assets/hold-and-release.svg'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { getAssetUrl } from 'lib/getAssetUrl'
import { Step, Steps, useSteps } from 'chakra-ui-steps';

import { Row } from '../../Row/Row'

export const OnboardModal = () => {
  const { keepkey } = useWallet()
  const { onboard } = useModal()
  const { close, isOpen } = onboard

  const [kkConnect, setKKConnect] = useState(KeepKeyConnect)
  const [kkRelease, setKKRelease] = useState(KeepKeyRelease)

  useEffect(() => {
    getAssetUrl(KeepKeyConnect).then(setKKConnect)
    getAssetUrl(KeepKeyRelease).then(setKKRelease)
  }, [])

  const HandleUpdateFirmware = async () => {
    console.info('Updating firmware (firmware modal)')
    // setLoadingFirmware(true)
    ipcRenderer.send('@keepkey/update-firmware', {})
  }

  const content = (
      <Flex py={4}>
        <small>blablabla</small>
      </Flex>
  );

  const steps = [
    { label: 'Step 1', content },
    { label: 'Step 2', content },
    { label: 'Step 3', content },
  ];
  const { nextStep, prevStep, setStep, reset, activeStep } = useSteps({
    initialStep: 0,
  });
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        ipcRenderer.send('unlockWindow', {})
        ipcRenderer.send('@modal/close', {})
        close()
      }}
      isCentered
      closeOnOverlayClick={false}
      closeOnEsc={false}
    >
      <ModalOverlay />
      <ModalContent justifyContent='center' px={3} pt={3} pb={6}>
        <ModalCloseButton ml='auto' borderRadius='full' position='static' />
        <ModalHeader>
          <Text translation={'modals.firmware.header'} />
        </ModalHeader>
        <ModalBody>
          <div>
            <Flex flexDir="column" width="100%">
              <Steps activeStep={activeStep}>
                {steps.map(({ label, content }) => (
                    <Step label={label} key={label}>
                      {content}
                    </Step>
                ))}
              </Steps>
              {activeStep === steps.length ? (
                  <Flex p={4}>
                    <Button mx="auto" size="sm" onClick={reset}>
                      Reset
                    </Button>
                  </Flex>
              ) : (
                  <Flex width="100%" justify="flex-end">
                    <Button
                        isDisabled={activeStep === 0}
                        mr={4}
                        onClick={prevStep}
                        size="sm"
                        variant="ghost"
                    >
                      Prev
                    </Button>
                    <Button size="sm" onClick={nextStep}>
                      {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
                    </Button>
                  </Flex>
              )}
            </Flex>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
