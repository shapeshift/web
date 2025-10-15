import {
  Box,
  Button,
  FormControl,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text as ChakraText,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useRef } from 'react'
import type { ControllerProps } from 'react-hook-form'

import { AddressInput } from '../AddressInput/AddressInput'

import { QRCodeIcon } from '@/components/Icons/QRCode'

interface AddressInputWithDropdownProps {
  addressInputRules: ControllerProps['rules']
  supportsENS: boolean
  translate: (key: string) => string
  onScanQRCode: () => void
}

const qrCodeIcon = <QRCodeIcon />

export const AddressInputWithDropdown = ({
  addressInputRules,
  supportsENS,
  translate,
  onScanQRCode,
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
              pe={16}
              rules={addressInputRules}
              placeholder={translate(
                supportsENS ? 'modals.send.toAddressOrEns' : 'modals.send.toAddress',
              )}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onPaste={onClose}
            />
          </Box>
        </PopoverTrigger>
        <PopoverContent width='full'>
          <PopoverBody px={2}>
            <VStack align='stretch' spacing={0}>
              <Button
                size='lg'
                leftIcon={qrCodeIcon}
                onClick={handleQRClick}
                justifyContent='flex-start'
                height='auto'
                background='transparent'
                m={-2}
                p={2}
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
            </VStack>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </FormControl>
  )
}
