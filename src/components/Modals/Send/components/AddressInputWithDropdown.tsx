import {
  Box,
  Button,
  FormControl,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Portal,
  Text as ChakraText,
  VStack,
} from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip/dist/cjs'
import { useCallback, useMemo } from 'react'
import type { ControllerProps } from 'react-hook-form'
import { useFormContext, useWatch } from 'react-hook-form'

import { AddressInput } from '../AddressInput/AddressInput'

import { QRCodeIcon } from '@/components/Icons/QRCode'
import { AddressBook } from '@/components/Modals/Send/AddressBook/AddressBook'
import type { SendInput } from '@/components/Modals/Send/Form'
import { useModalChildZIndex } from '@/context/ModalStackProvider'

interface AddressInputWithDropdownProps {
  addressInputRules: ControllerProps['rules']
  supportsENS: boolean
  translate: (key: string) => string
  onScanQRCode: () => void
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
  onSelectEntry,
  onSaveContact,
  onEmptied,
}: AddressInputWithDropdownProps) => {
  const { control } = useFormContext<SendInput>()
  const { assetId } = useWatch({
    control,
  }) as Partial<SendInput>

  const chainId = useMemo(() => fromAssetId(assetId ?? '').chainId, [assetId])

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
              onSaveContact={onSaveContact}
              onEmptied={onEmptied}
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
