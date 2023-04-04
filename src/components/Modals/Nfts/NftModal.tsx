import {
  Box,
  Image,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Stack,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { useModal } from 'hooks/useModal/useModal'
import type { V2ZapperNft } from 'state/apis/zapper/client'

type NftModalProps = {
  zapperNft: V2ZapperNft
}

export const NftModal: React.FC<NftModalProps> = ({ zapperNft }) => {
  const { nft } = useModal()
  const { close, isOpen } = nft

  const imageUrl = zapperNft?.medias?.[0]?.originalUrl

  console.log(JSON.stringify(zapperNft, null, 2))

  const nftModalImage = useMemo(() => {
    return (
      <Box borderRadius='lg' p={2} position='relative' overflow='hidden'>
        <Image
          src={imageUrl}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            filter: 'blur(20px)',
            opacity: 0.3,
            zIndex: -1,
          }}
        />
        <Stack direction='row' alignItems='center'>
          <Image borderRadius='lg' boxSize='300px' m={50} src={imageUrl} boxShadow='xl' />
        </Stack>
      </Box>
    )
  }, [imageUrl])

  const nftModalContent = useMemo(() => {
    return <Box>content</Box>
  }, [])

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <Box display='flex'>
          {nftModalImage}
          {nftModalContent}
        </Box>
      </ModalContent>
    </Modal>
  )
}
