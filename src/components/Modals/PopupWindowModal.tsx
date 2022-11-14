import { Button, Center, Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { useCallback, useEffect, useRef } from 'react'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { RawText } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'

function popupCenterWindow(url: string, windowName: string, w: number, h: number) {
  if (!window.top) return window.open(url, '_blank')?.focus()
  const y = window.top.outerHeight / 2 + window.top.screenY - h / 2
  const x = window.top.outerWidth / 2 + window.top.screenX - w / 2
  return window.open(
    url,
    windowName,
    `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${w}, height=${h}, top=${y}, left=${x}`,
  )
}

type PopupWindowModalProps = {
  url: string
  title: string
  width?: string
  height?: string
}

export const PopupWindowModal: React.FC<PopupWindowModalProps> = ({
  title,
  url,
  width = '482px',
  height = '660px',
}) => {
  const { popup } = useModal()
  const { close: onClose, isOpen } = popup
  const popupRef = useRef<Window | null | void>(null)

  const handleFocusWindow = useCallback(() => {
    if (popupRef.current) {
      popupRef.current.focus()
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    popupRef.current = popupCenterWindow(url, title, 450, 600)
    var loop = setInterval(function () {
      if (popupRef.current && popupRef.current.closed) {
        clearInterval(loop)
        popup.close()
      }
    }, 1000)
  }, [popup, isOpen, title, url])
  return (
    <Modal isOpen={isOpen} onClose={onClose} size='full'>
      <ModalOverlay
        backdropFilter='blur(10px)'
        bgColor='blackAlpha.100'
        bgImage='radial-gradient(ellipse at center, rgba(0,0,0,0) 0%,rgba(0,0,0,0) 3%,rgba(0,0,0,1) 77%,rgba(0,0,0,1) 100%)'
      />
      <ModalContent alignItems='center' justifyContent='center' bg='transparent'>
        <Center
          width={{ base: '100%', md: width }}
          height={height}
          position='relative'
          flexDir='column'
          gap={6}
        >
          <CircularProgress />
          <RawText fontSize='xl'>We loaded the window for you</RawText>
          <Button onClick={handleFocusWindow}>Show Window</Button>
        </Center>
      </ModalContent>
    </Modal>
  )
}
