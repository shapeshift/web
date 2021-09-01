import { PhoneIcon } from '@chakra-ui/icons'
import { Box, Center, Collapse, Flex, Heading, useColorModeValue } from '@chakra-ui/react'
import { RawText, Text } from 'components/Text'
import { useState } from 'react'

export const TransactionRow = () => {
  const [isOpen, setIsOpen] = useState(false)
  const toggleOpen = () => setIsOpen(!isOpen)
  return (
    <Box
      as='button'
      onClick={toggleOpen}
      width='full'
      py={4}
      pl={3}
      pr={4}
      rounded='lg'
      _hover={{ bg: useColorModeValue('gray.50', 'whiteAlpha.100') }}
    >
      <Flex alignItems='center' flex={1} justifyContent='space-between'>
        <Flex alignItems='center'>
          <Center w='10' h='10' bg={'whiteAlpha.200'} rounded='full' mr='3'>
            <PhoneIcon />
          </Center>
          <Text translation='transactionRow.sent' />
          <RawText ml={2}>0.111 BTC</RawText>
        </Flex>
        <RawText>Jan 5, 2021</RawText>
      </Flex>
      <Collapse in={isOpen}>
        <Heading>
          <Text translation={'transactionRow.moreDetails'} />
        </Heading>
      </Collapse>
    </Box>
  )
}
