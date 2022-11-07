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

export const UpdateKeepKey = (params: any) => {
    const { updateKeepKey } = useModal()
    const { close, isOpen } = updateKeepKey
    const updateFirmware = useMemo(() => params?.event?.firmwareUpdateNeededNotBootloader, [params])

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
                <ModalBody>
                    <div>
                        <ModalHeader>
                            <Text color={updateFirmware && 'green.500'} translation='1. Bootloader update required' />
                            <Text translation='2. Firware update required' />
                            {updateFirmware ? <UpdateFirmware {...params} /> : <UpdateBootloader {...params} />}
                        </ModalHeader>
                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
    )
}
