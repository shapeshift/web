import { Modal, ModalContent, ModalOverlay, useMediaQuery } from '@chakra-ui/react'
import styled from '@emotion/styled'
import type { PropsWithChildren } from 'react'
import React, { useEffect, useMemo } from 'react'
import { Drawer } from 'vaul'
import { useDialog, withDialogProvider } from 'context/DialogContextProvider/DialogContextProvider'
import { isMobile } from 'lib/globals'
import { breakpoints } from 'theme/theme'

export type DialogProps = {
  isOpen: boolean
  onClose: () => void
  height?: string
  isFullScreen?: boolean
} & PropsWithChildren

const CustomDrawerContent = styled(Drawer.Content)`
  background-color: var(--chakra-colors-background-surface-base);
  display: flex;
  flex-direction: column;
  border-radius: 24px 24px 0 0;
  position: fixed;
  max-height: 95%;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: var(--chakra-zIndices-modal);
`

const CustomDrawerOverlay = styled(Drawer.Overlay)`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.8);
  z-index: var(--chakra-zIndices-modal);
`

const DialogWindow: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  height,
  isFullScreen,
  children,
}) => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const { snapPoint, setIsOpen, isOpen: isDialogOpen } = useDialog()

  const contentStyle = useMemo(() => {
    return {
      maxHeight: isFullScreen ? '100vh' : 'calc(100% - env(safe-area-inset-top))',
      height: isFullScreen ? '100dvh' : height,
      paddingTop: isFullScreen ? 'env(safe-area-inset-top)' : 0,
    }
  }, [height, isFullScreen])

  useEffect(() => {
    setIsOpen(isOpen)
  }, [isOpen, setIsOpen])

  if (isMobile || !isLargerThanMd) {
    return (
      <Drawer.Root open={isDialogOpen} onClose={onClose} activeSnapPoint={snapPoint}>
        <Drawer.Portal>
          <CustomDrawerOverlay />
          <CustomDrawerContent style={contentStyle}>{children}</CustomDrawerContent>
        </Drawer.Portal>
      </Drawer.Root>
    )
  }
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent height={height}>{children}</ModalContent>
    </Modal>
  )
}

export const Dialog = withDialogProvider(DialogWindow)
