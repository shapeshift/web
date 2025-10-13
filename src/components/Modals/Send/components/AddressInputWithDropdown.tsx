import {
  Box,
  Button,
  Text as ChakraText,
  FormControl,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useCallback, useRef } from 'react'

import { AddressInput } from '../AddressInput/AddressInput'
import { QRCodeIcon } from './QRCodeIcon'

import { AddressBook } from '@/components/Modals/Send/AddressBook/AddressBook'

interface AddressInputWithDropdownProps {
  addressInputRules: any
  supportsENS: boolean
  translate: (key: string) => string
  onScanQRCode: () => void
  chainId?: ChainId
  resolvedAddress?: string
  onSelectEntry: (address: string) => void
  showSaveButton?: boolean
  onSaveContact?: () => void
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
  showSaveButton,
  onSaveContact,
  onEmptied,
  chainId,
}: AddressInputWithDropdownProps) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const triggerRef = useRef<HTMLDivElement>(null)

  const handleFocus = useCallback(() => {
    if (!isOpen) {
      onOpen()
    }
  }, [onOpen, isOpen])

  const handleBlur = useCallback(() => {
    onClose()
  }, [onClose])

  const handleQRClick = useCallback(() => {
    onScanQRCode()
    onClose()
  }, [onScanQRCode, onClose])

  const handleSelectEntry = useCallback(
    (address: string) => {
      onSelectEntry(address)
      onClose()
    },
    [onSelectEntry, onClose],
  )

  return (
    <FormControl>
      <Popover
        isOpen={isOpen}
        placement='bottom-start'
        closeOnBlur={true}
        autoFocus={false}
        matchWidth
      >
        <PopoverTrigger>
          <Box ref={triggerRef}>
            <AddressInput
              rules={addressInputRules}
              placeholder={translate(
                supportsENS ? 'modals.send.addressInput' : 'modals.send.tokenAddress',
              )}
              resolvedAddress={resolvedAddress}
              onSaveContact={showSaveButton ? onSaveContact : undefined}
              onEmptied={onEmptied}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onPaste={onClose}
              chainId={chainId}
            />
          </Box>
        </PopoverTrigger>
        <PopoverContent width='full'>
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
      </Popover>
    </FormControl>
  )
}
