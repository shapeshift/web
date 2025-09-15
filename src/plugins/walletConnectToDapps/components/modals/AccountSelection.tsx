import { ArrowBackIcon } from '@chakra-ui/icons'
import { Box, Button, HStack, IconButton, Image, Radio, RadioGroup, VStack } from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'

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
  const handleAddressChange = useCallback(
    (address: string) => onAddressChange(address),
    [onAddressChange],
  )
  const spacerBox = useMemo(() => <Box w={8} />, [])
  const backIcon = useMemo(() => <ArrowBackIcon />, [])
  const _hoverStyles = useMemo(() => ({ bg: 'whiteAlpha.50' }), [])
  const handleClickAddress = useCallback(
    (address: string) => () => onAddressChange(address),
    [onAddressChange],
  )

  return (
    <VStack spacing={0} align='stretch' h='full'>
      <HStack spacing={3} p={4} align='center'>
        <IconButton aria-label='Back' icon={backIcon} size='sm' variant='ghost' onClick={onBack} />
        <RawText fontWeight='semibold' fontSize='xl' flex={1} textAlign='center'>
          {translate('plugins.walletConnectToDapps.modal.chooseAccount')}
        </RawText>
        {spacerBox}
      </HStack>

      <RadioGroup value={selectedAddress || ''} onChange={handleAddressChange}>
        <VStack spacing={0} align='stretch' px={2} pb={4} flex={1}>
          {uniqueEvmAddresses.map((address, index) => (
            <Box key={address} py={3}>
              <HStack
                spacing={3}
                width='full'
                align='center'
                cursor='pointer'
                onClick={handleClickAddress(address)}
              >
                <Image borderRadius='full' boxSize='40px' src={makeBlockiesUrl(address)} />
                <VStack spacing={0} align='start' flex={1}>
                  <RawText fontSize='md' fontWeight='medium'>
                    Account #{index}
                  </RawText>
                  <RawText fontSize='sm' color='gray.500'>
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </RawText>
                </VStack>
                <Radio value={address} />
              </HStack>
            </Box>
          ))}
        </VStack>
      </RadioGroup>

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
