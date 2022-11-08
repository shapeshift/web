import {
    Modal,
    ModalCloseButton,
    ModalContent,
    ModalOverlay,
} from '@chakra-ui/react'
import { useEffect } from 'react'
import { useModal } from 'hooks/useModal/useModal'
import { UpdateBootloader } from './UpdateBootloader/UpdateBootloader'
import { UpdateFirmware } from './UpdateFirmware/UpdateFirmware'
import { Step, Steps, useSteps } from 'chakra-ui-steps';
import { KeepKeyFactoryState } from './FactoryState'
import { useWallet } from 'hooks/useWallet/useWallet'

export const UpdateKeepKey = (params: any) => {
    const { updateKeepKey, hardwareError } = useModal()
    const { close, isOpen } = updateKeepKey
    const { setStep, activeStep } = useSteps({
        initialStep: 0,
    });
    const { setNeedsReset, disconnect } = useWallet()

    useEffect(() => {
        if (params?.event?.bootloaderUpdateNeeded) {
            setStep(0)
        } else if (params?.event?.firmwareUpdateNeededNotBootloader) {
            setStep(1)
        } else {
            setStep(2)
        }

    }, [params?.event])

    const steps = [
        { label: 'Bootloader', content: <UpdateBootloader {...params} /> },
        { label: 'Firmware', content: <UpdateFirmware {...params} /> },
        { label: 'Create Wallet', content: <KeepKeyFactoryState /> },
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                disconnect()
                close()
                setNeedsReset(true)
            }}
            isCentered
            closeOnOverlayClick={false}
            closeOnEsc={false}
        >
            <ModalOverlay />
            <ModalContent justifyContent='center' p={3}>
                <ModalCloseButton ml='auto' borderRadius='full' position='static' />
                <Steps activeStep={activeStep}>
                    {steps.map(({ label, content }: any) => (
                        <Step label={label} key={label}>
                            {content}
                        </Step>
                    ))}
                </Steps>
            </ModalContent>
        </Modal>
    )
}
