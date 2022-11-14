import { Button, Center, Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { useCallback, useEffect, useRef } from 'react'
import { useTranslate } from 'react-polyglot'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Text } from 'components/Text'
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
  width?: number
  height?: number
}

export const PopupWindowModal: React.FC<PopupWindowModalProps> = ({
  title,
  url,
  width = 482,
  height = 660,
}) => {
  const { popup } = useModal()
  const translate = useTranslate()
  const { close: onClose, isOpen } = popup
  const popupRef = useRef<Window | null | void>(null)

  const handleFocusWindow = useCallback(() => {
    if (popupRef.current) {
      popupRef.current.focus()
    }
  }, [])

  const handleCloseWindow = useCallback(() => {
    if (popupRef.current) {
      popupRef.current.close()
    }
  }, [])

  const handleContinue = useCallback(() => {
    window.open(url, '_blank')?.focus()
  }, [url])

  useEffect(() => {
    if (!isOpen) return
    popupRef.current = popupCenterWindow(url, title, width, height)
    var loop = setInterval(function () {
      if (popupRef.current && popupRef.current.closed) {
        clearInterval(loop)
        popup.close()
      }
    }, 1000)
  }, [popup, isOpen, title, url, width, height])
  return (
    <Modal isOpen={isOpen} onClose={onClose} size='full'>
      <ModalOverlay
        backdropFilter='blur(10px)'
        bgColor='blackAlpha.100'
        bgImage='radial-gradient(ellipse at center, rgba(0,0,0,1) 0%,rgba(0,0,0,1) 1%,rgba(0,0,0,0) 100%);'
      />
      <ModalContent alignItems='center' justifyContent='center' bg='transparent'>
        <Center
          width={{ base: '100%', md: '350px' }}
          height={height}
          flexDirection='column'
          textAlign='center'
          gap={6}
          position='relative'
        >
          <CircularProgress />
          <Text
            translation={popupRef.current ? 'modals.popup.body' : 'modals.popup.body2'}
            fontSize='xl'
          />
          {popupRef?.current ? (
            <Button onClick={handleFocusWindow}>{translate('modals.popup.showWindow')}</Button>
          ) : (
            <Button onClick={handleContinue}>{translate('modals.popup.continue')}</Button>
          )}
          <Button onClick={handleCloseWindow} variant='ghost'>
            {translate('modals.popup.cancel')}
          </Button>
        </Center>
      </ModalContent>
    </Modal>
  )
}
