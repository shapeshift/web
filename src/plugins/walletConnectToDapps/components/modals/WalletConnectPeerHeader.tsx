import { Image, VStack } from '@chakra-ui/react'
import type { SessionTypes } from '@walletconnect/types'
import type { FC } from 'react'

import { RawText } from '@/components/Text'

type WalletConnectPeerHeaderProps = {
  peerMetadata: SessionTypes.Struct['peer']['metadata'] | undefined
}

export const WalletConnectPeerHeader: FC<WalletConnectPeerHeaderProps> = ({ peerMetadata }) => {
  if (!peerMetadata) return null

  return (
    <VStack spacing={4} align='center' py={6}>
      <Image borderRadius='full' boxSize='48px' src={peerMetadata.icons?.[0]} />
      <RawText fontWeight='semibold' fontSize='lg'>
        {peerMetadata.name}
      </RawText>
    </VStack>
  )
}
