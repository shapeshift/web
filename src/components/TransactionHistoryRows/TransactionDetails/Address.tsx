import { Button, Link } from '@chakra-ui/react'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'

export const Address = ({
  explorerAddressLink,
  address,
  ens,
}: {
  explorerAddressLink?: string
  address: string
  ens?: string
}) =>
  explorerAddressLink ? (
    <Button
      as={Link}
      href={`${explorerAddressLink}${ens || address}`}
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
      fontSize='inherit'
    >
      <MiddleEllipsis value={ens || address} />
    </Button>
  ) : (
    <MiddleEllipsis value={ens || address} />
  )
