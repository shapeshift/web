import { Flex } from '@chakra-ui/react'
import { Text } from 'components/Text'

export const Row = ({ title, children }: { title: string; children: React.ReactNode }) => {
  return (
    <Flex mb={1} flexBasis='50%' alignItems='center' lineHeight={1}>
      <Flex flex={1}>
        <Text lineHeight={1} color='gray.600' translation={`transactionHistory.${title}`} />
      </Flex>
      <Flex flex={1}>{children}</Flex>
    </Flex>
  )
}
