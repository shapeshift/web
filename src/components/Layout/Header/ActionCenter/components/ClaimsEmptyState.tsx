import { Flex, Icon, Stack } from '@chakra-ui/react'
import { TbCoins } from 'react-icons/tb'

import { Text } from '@/components/Text/Text'

export const ClaimsEmptyState = () => (
  <Stack spacing={4} align='center' mx={2} px={4} py={16}>
    <Flex
      align='center'
      justify='center'
      boxSize='64px'
      borderRadius='50%'
      bg='background.button.secondary.base'
    >
      <Icon as={TbCoins} boxSize={8} color='text.subtle' />
    </Flex>
    <Text fontSize='md' color='text.subtle' translation='actionCenter.nothingToClaim' />
  </Stack>
)
