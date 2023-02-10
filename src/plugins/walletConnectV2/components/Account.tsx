import { Flex, Tag } from '@chakra-ui/react'
import { useColorModeValue } from '@chakra-ui/system'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { RawText } from 'components/Text'

interface IProps {
  accountId: AccountId
  toggleAccountId: (accountId: string) => void
  isSelected: boolean
  accountNumber: string
}

export const Account: FC<IProps> = ({ accountId, isSelected, toggleAccountId, accountNumber }) => {
  const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const blueColor = useColorModeValue('blue.500', 'blue.200')
  const hoverColor = useColorModeValue('blackAlpha.300', 'whiteAlpha.300')
  const focusColor = useColorModeValue('blackAlpha.400', 'whiteAlpha.400')
  const chainId = fromAccountId(accountId).chainReference

  // FIXME: Get asset and show logo and colour
  return (
    <Flex
      borderWidth={1}
      cursor='pointer'
      borderColor={isSelected ? blueColor : borderColor}
      _hover={{ borderColor: isSelected ? blueColor : hoverColor }}
      _active={{ borderColor: isSelected ? blueColor : focusColor }}
      borderRadius='xl'
      flexDir='column'
      gap={2}
      width='full'
      px={4}
      py={2}
      fontSize='sm'
      onClick={() => toggleAccountId(accountId)}
      transitionProperty='common'
      transitionDuration='normal'
    >
      <Flex justifyContent='space-between' alignItems='center'>
        <Flex gap={2}>
          <RawText>
            Account {accountNumber}: {accountId}
          </RawText>
          <Tag size='sm' colorScheme='green'>
            {chainId}
          </Tag>
        </Flex>
      </Flex>
    </Flex>
  )
}
