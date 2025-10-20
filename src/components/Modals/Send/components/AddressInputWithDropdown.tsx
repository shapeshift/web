import {
  Box,
  Button,
  Text as ChakraText,
  FormControl,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Portal,
  VStack,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'

import { AddressInput } from '../AddressInput/AddressInput'
import { QRCodeIcon } from './QRCodeIcon'

import { AddressBook } from '@/components/Modals/Send/AddressBook/AddressBook'
import { useModalChildZIndex } from '@/context/ModalStackProvider'

interface AddressInputWithDropdownProps {
  addressInputRules: any
  supportsENS: boolean
  translate: (key: string) => string
  onScanQRCode: () => void
  chainId?: ChainId
  resolvedAddress?: string
  onSelectEntry: (address: string) => void
  onSaveContact: (e: React.MouseEvent<HTMLButtonElement>) => void
  onEmptied?: () => void
}

const qrCodeIcon = <QRCodeIcon />

export const AddressInputWithDropdown = ({
  addressInputRules,
  supportsENS,
  translate,
  onScanQRCode,
  resolvedAddress,
  onSelectEntry,
  onSaveContact,
  onEmptied,
  chainId,
}: AddressInputWithDropdownProps) => {
  const modalChildZIndex = useModalChildZIndex()
  const handleQRClick = useCallback(() => {
    onScanQRCode()
  }, [onScanQRCode])

  const handleSelectEntry = useCallback(
    (address: string) => {
      onSelectEntry(address)
    },
    [onSelectEntry],
  )

  return (
    <FormControl>
      <Popover placement='bottom-start' matchWidth trigger='hover' gutter={0}>
        <PopoverTrigger>
          <Box>
            <AddressInput
              rules={addressInputRules}
              placeholder={translate(
                supportsENS ? 'modals.send.addressInput' : 'modals.send.tokenAddress',
              )}
              resolvedAddress={resolvedAddress}
              onSaveContact={onSaveContact}
              onEmptied={onEmptied}
              chainId={chainId}
            />
          </Box>
        </PopoverTrigger>
        <Portal>
          <PopoverContent width='full' zIndex={modalChildZIndex}>
            <PopoverBody px={4} py={3}>
              <VStack align='stretch' spacing={3}>
                <Button
                  size='lg'
                  leftIcon={qrCodeIcon}
                  onClick={handleQRClick}
                  justifyContent='flex-start'
                  height='auto'
                  variant='ghost'
                  px={2}
                  py={2}
                >
                  <VStack align='start' spacing={0}>
                    <ChakraText fontSize='md' fontWeight='medium' color='text.primary'>
                      {translate('modals.send.scanQrCode')}
                    </ChakraText>
                    <ChakraText fontSize='sm' color='text.subtle'>
                      {translate('modals.send.sendForm.scanQrCodeDescription')}
                    </ChakraText>
                  </VStack>
                </Button>

                <AddressBook onSelectEntry={handleSelectEntry} chainId={chainId} />
              </VStack>
            </PopoverBody>
          </PopoverContent>
        </Portal>
      </Popover>
    </FormControl>
  )
}
