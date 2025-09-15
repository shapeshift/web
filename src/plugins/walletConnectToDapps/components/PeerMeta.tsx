import { Image, VStack } from '@chakra-ui/react'
import type { SignClientTypes } from '@walletconnect/types'
import type { FC } from 'react'

import { RawText } from '@/components/Text'

type PeerMetaProps = {
  // Override the icons type, as it's incorrect - "icons" can indeed be undefined in the wild.
  metadata: Omit<SignClientTypes.Metadata, 'icons'> & { icons: string[] | undefined }
}

export const PeerMeta: FC<PeerMetaProps> = ({ metadata }) => {
  const { icons, name, url } = metadata
  const icon = icons && icons.length > 0 ? icons[0] : undefined

  return (
    <VStack spacing={4} align='center' py={6}>
      {icon && <Image borderRadius='full' boxSize='48px' src={icon} />}
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
