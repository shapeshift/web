import { Button, Link } from '@chakra-ui/react'
import { useCallback } from 'react'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'

const hover = { bg: 'transparent' }

export const TransactionLink = ({ txLink, txid }: { txLink: string; txid: string }) => {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => e.stopPropagation(),
    [],
  )

  return (
    <Button
      as={Link}
      isExternal
      href={txLink}
      variant='ghost'
      colorScheme='blue'
      bg='transparent'
      fontWeight='normal'
      fontFamily='monospace'
      onClick={handleClick}
      p={0}
      height='auto'
      fontSize='inherit'
      _hover={hover}
      display='flex'
      alignItems='center'
    >
      <MiddleEllipsis value={txid} />
    </Button>
  )
}
