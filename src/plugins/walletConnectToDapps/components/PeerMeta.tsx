import type { SpaceProps } from '@chakra-ui/react'
import { VStack } from '@chakra-ui/react'
import type { SignClientTypes } from '@walletconnect/types'
import type { FC } from 'react'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { RawText } from '@/components/Text'

type PeerMetaProps = {
  metadata: SignClientTypes.Metadata
} & SpaceProps

export const PeerMeta: FC<PeerMetaProps> = ({ metadata, py = 6, ...spaceProps }) => {
  const { icons, name, url } = metadata
  const icon = icons && icons.length > 0 ? icons[0] : undefined

  return (
    <VStack spacing={4} align='center' py={py} {...spaceProps}>
      {icon && <LazyLoadAvatar borderRadius='full' boxSize='48px' src={icon} />}
      <VStack spacing={1} align='center'>
        <RawText fontWeight='semibold' fontSize='lg' textAlign='center'>
          {name}
        </RawText>
        <RawText color='text.subtle' fontSize='sm' textAlign='center'>
          {url?.replace(/^https?:\/\//, '')}
        </RawText>
      </VStack>
    </VStack>
  )
}
