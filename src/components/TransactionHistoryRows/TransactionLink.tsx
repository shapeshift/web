import { Button, Link } from '@chakra-ui/react'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'

export const TransactionLink = ({
  explorerTxLink,
  txid,
}: {
  explorerTxLink: string
  txid: string
}) => (
  <Button
    as={Link}
    isExternal
    href={`${explorerTxLink}${txid}`}
    variant='ghost'
    colorScheme='blue'
    bg='transparent'
    fontWeight='normal'
    fontFamily='monospace'
    onClick={e => e.stopPropagation()}
    p={0}
    height='auto'
    fontSize='inherit'
    _hover={{ bg: 'transparent' }}
    display='flex'
    alignItems='center'
  >
    <MiddleEllipsis value={txid} />
  </Button>
)
