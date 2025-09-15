import { ArrowBackIcon } from '@chakra-ui/icons'
import { Box, Button, HStack, IconButton, Image, Radio, RadioGroup, VStack } from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from '@/components/Text'
import { makeBlockiesUrl } from '@/lib/blockies/makeBlockiesUrl'

type AccountSelectionProps = {
  uniqueEvmAddresses: string[]
  selectedAddress: string | null
  onAddressChange: (address: string) => void
  onBack: () => void
  onDone: () => void
  translate: (key: string) => string
}

export const AccountSelection: FC<AccountSelectionProps> = ({
  uniqueEvmAddresses,
  selectedAddress,
  onAddressChange,
  onBack,
  onDone,
  translate,
}) => {
  return (
    <VStack spacing={0} align='stretch' h='full'>
      {/* Header with back arrow */}
      <HStack spacing={3} p={4} align='center'>
        <IconButton
          aria-label='Back'
          icon={<ArrowBackIcon />}
          size='sm'
          variant='ghost'
          onClick={onBack}
        />
        <RawText fontWeight='semibold' fontSize='xl' flex={1} textAlign='center'>
          {translate('plugins.walletConnectToDapps.modal.chooseAccount')}
        </RawText>
        <Box w={8} /> {/* Spacer for centering */}
      </HStack>

      {/* Account list */}
      <RadioGroup value={selectedAddress || ''} onChange={address => onAddressChange(address)}>
        <VStack spacing={0} align='stretch' px={2} pb={4} flex={1}>
          {uniqueEvmAddresses.map((address, index) => (
            <Box key={address} py={3}>
              <HStack
                spacing={3}
                align='center'
                cursor='pointer'
                onClick={() => onAddressChange(address)}
                _hover={{ bg: 'whiteAlpha.50' }}
                px={2}
                py={2}
                borderRadius='md'
              >
                <Radio value={address}>
                  <HStack spacing={3} align='center'>
                    <Image src={makeBlockiesUrl(address)} boxSize='32px' borderRadius='full' />
                    <VStack spacing={0} align='start'>
                      <RawText fontWeight='medium'>Account {index + 1}</RawText>
                      <MiddleEllipsis value={address} fontSize='xs' color='text.subtle' />
                    </VStack>
                  </HStack>
                </Radio>
              </HStack>
            </Box>
          ))}
        </VStack>
      </RadioGroup>

      {/* Done button */}
      <Box p={4}>
        <Button
          size='lg'
          colorScheme='blue'
          w='full'
          onClick={onDone}
          isDisabled={!selectedAddress}
        >
          {translate('common.done')}
        </Button>
      </Box>
    </VStack>
  )
}
