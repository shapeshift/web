import {
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Table,
    Tbody,
    Td,
    Th,
    Thead,
    Tr,
} from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import { useEffect, useMemo } from 'react'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { UpdateBootloader } from './UpdateBootloader/UpdateBootloader'
import { UpdateFirmware } from './UpdateFirmware/UpdateFirmware'
import { getRenderedIdenticonBase64 } from '@keepkey/asset-service/dist/service/GenerateAssetIcon'
import { Step, Steps, useSteps } from 'chakra-ui-steps';
import { KeepKeyFactoryState } from './FactoryState'



export const UpdateKeepKey = (params: any) => {
    const { updateKeepKey } = useModal()
    const { close, isOpen } = updateKeepKey
    const { nextStep, prevStep, setStep, reset, activeStep } = useSteps({
        initialStep: 0,
    });
    console.log(params)
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
                close()
            }}
            isCentered
            closeOnOverlayClick={false}
            closeOnEsc={false}
        >
            <ModalOverlay />
            <ModalContent justifyContent='center' px={3} pt={3} pb={6}>
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
