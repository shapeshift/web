import { Center, Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { useModal } from 'hooks/useModal/useModal'

type IframeModalProps = {
  url: string
  title: string
  width?: string
  height?: string
}

export const IframeModal: React.FC<IframeModalProps> = ({
  title,
  url,
  width = '482px',
  height = '660px',
}) => {
  const { iframe } = useModal()
  const { close, isOpen } = iframe
  return (
    <Modal isOpen={isOpen} onClose={close} size='full'>
      <ModalOverlay backdropFilter='blur(10px)' />
      <ModalContent alignItems='center' justifyContent='center' bg='transparent'>
        <Center width={{ base: '100%', md: width }} height={height} position='relative'>
          <ModalCloseButton top={-12} right={0} variant='solid' />
          <iframe
            src={url}
            title={title}
            width='100%'
            height='100%'
            frameBorder='0'
            allow='accelerometer; autoplay; camera; gyroscope; payment'
          />
        </Center>
      </ModalContent>
    </Modal>
  )
}
