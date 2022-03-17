import { Button, Link, useColorModeValue } from '@chakra-ui/react'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'

export const TransactionLink = ({
  explorerTxLink,
  txid
}: {
  explorerTxLink: string
  txid: string
}) => (
  <Link
    isExternal
    color={useColorModeValue('blue.400', 'blue.200')}
    _hover={{ textDecoration: 'none' }}
    href={`${explorerTxLink}${txid}`}
    onClick={e => {
      // don't trigger parent onClick
      e.stopPropagation()
    }}
  >
    <Button
      bg={useColorModeValue('gray.200', 'gray.900')}
      fontWeight='normal'
      p={2}
      height={{ base: 6, md: 8 }}
      fontSize={{ base: 'sm', md: 'md' }}
      _hover={{ bg: useColorModeValue('gray.300', 'gray.800') }}
    >
      <MiddleEllipsis address={txid} />
    </Button>
  </Link>
)
