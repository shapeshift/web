import { Button, Link } from '@chakra-ui/react'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'

export const Address = ({
  explorerTxLink,
  address,
  ens
}: {
  explorerTxLink?: string
  address: string
  ens?: string
}) =>
  explorerTxLink ? (
    <Button
      as={Link}
      href={`${explorerTxLink}${ens || address}`}
      isExternal
      bg='transparent'
      variant='ghost'
      colorScheme='blue'
      fontWeight='normal'
      p={0}
      onClick={e => e.stopPropagation()}
      height='auto'
      fontFamily='monospace'
      _hover={{ bg: 'transparent' }}
      fontSize={{ base: 'sm', md: 'md' }}
    >
      <MiddleEllipsis address={ens || address} />
    </Button>
  ) : (
    <MiddleEllipsis address={ens || address} />
  )
