import type { FlexProps } from '@chakra-ui/react'
import { Button, Flex, Link } from '@chakra-ui/react'

const Id = ({ id, ...rest }: FlexProps & { id: string }) => (
  <Flex alignItems='center' whiteSpace='nowrap' {...rest}>
    <span style={{ lineHeight: 1 }}>
      {id.length >= 12 ? `${id.slice(0, 4)}...${id.slice(-4)}` : id}
    </span>
  </Flex>
)

export const NftId = ({
  explorer,
  id,
  token,
}: {
  explorer?: string
  id: string
  token: string
}) => (
  <Button
    as={Link}
    href={`${explorer}/token/${token}?a=${id}`}
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
    <Id id={id} />
  </Button>
)
