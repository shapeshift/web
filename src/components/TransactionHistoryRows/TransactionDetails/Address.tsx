import { Button, Link } from '@chakra-ui/react'
import { useCallback } from 'react'
import { InlineCopyButton } from 'components/InlineCopyButton'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'

const buttonHover = { bg: 'transparent' }

export const Address = ({
  explorerAddressLink,
  address,
  ens,
}: {
  explorerAddressLink?: string
  address: string
  ens?: string
}) => {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => e.stopPropagation(),
    [],
  )
  return explorerAddressLink ? (
    <InlineCopyButton value={ens ?? address}>
      <Button
        as={Link}
        href={`${explorerAddressLink}${ens || address}`}
        isExternal
        bg='transparent'
        variant='ghost'
        colorScheme='blue'
        fontWeight='normal'
        p={0}
        onClick={handleClick}
        height='auto'
        fontFamily='monospace'
        _hover={buttonHover}
        fontSize='inherit'
      >
        <MiddleEllipsis value={ens || address} />
      </Button>
    </InlineCopyButton>
  ) : (
    <InlineCopyButton value={ens ?? address}>
      <MiddleEllipsis value={ens || address} />
    </InlineCopyButton>
  )
}
