import type { FlexProps } from '@chakra-ui/react'
import { Button, Flex, Link } from '@chakra-ui/react'
import { middleEllipsis } from 'lib/utils'

const Id = ({ id, ...rest }: FlexProps & { id: string }) => (
  <Flex alignItems='center' whiteSpace='nowrap' {...rest}>
    <span style={{ lineHeight: 1 }}>{middleEllipsis(id)}</span>
  </Flex>
)

export const NftId = ({
  explorer,
  id,
  assetReference,
}: {
  explorer?: string
  id: string
  assetReference: string
}) => (
  <Button
    as={Link}
    href={`${explorer}/token/${assetReference.split('/')[0]}?a=${id}`}
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
