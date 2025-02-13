import { Box, Modal, ModalContent, ModalOverlay, useMediaQuery } from '@chakra-ui/react'
import styled from '@emotion/styled'
import type { PropsWithChildren } from 'react'
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Drawer } from 'vaul'
import { useDialog, withDialogProvider } from 'context/DialogContextProvider/DialogContextProvider'
import { isMobile } from 'lib/globals'
import { breakpoints } from 'theme/theme'

export type DialogProps = {
  isOpen: boolean
  onClose: () => void
  height?: string
  isFullScreen?: boolean
  isDisablingPropagation?: boolean
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
  isDisablingPropagation = true,
}) => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const { snapPoint, setIsOpen, isOpen: isDialogOpen } = useDialog()

  const [viewportHeight, setViewportHeight] = useState(window.visualViewport?.height)

  useEffect(() => {
    function updateViewportHeight() {
      setViewportHeight(window.visualViewport?.height || 0)
    }

    window.visualViewport?.addEventListener('resize', updateViewportHeight)
    return () => window.visualViewport?.removeEventListener('resize', updateViewportHeight)
  }, [])

  const contentStyle = useMemo(() => {
    return {
      maxHeight: isFullScreen ? '100vh' : 'calc(100% - env(safe-area-inset-top))',
      height: isFullScreen ? viewportHeight : height || '80vh',
      paddingTop: isFullScreen ? 'env(safe-area-inset-top)' : 0,
    }
  }, [height, isFullScreen, viewportHeight])

  useEffect(() => {
    setIsOpen(isOpen)
  }, [isOpen, setIsOpen])

  // This is a workaround to prevent the body to be pointer-events: none when the dialog is open if isDisablingPropagation is false
  useEffect(() => {
    if (!isDialogOpen) return
    if (isDisablingPropagation) return

    const originalPointerEvents = document.body.style.pointerEvents
    const focusGuardedElements = document.querySelectorAll<HTMLElement>('*[data-radix-focus-guard]')

    const raf = window.requestAnimationFrame(() => {
      document.body.style.pointerEvents = 'auto'
      focusGuardedElements.forEach(element => {
        element.style.pointerEvents = 'auto'
      })
    })

    return () => {
      window.cancelAnimationFrame(raf)
      document.body.style.pointerEvents = originalPointerEvents
      focusGuardedElements.forEach(element => {
        element.style.pointerEvents = 'inherit'
      })
    }
  }, [isDialogOpen, isDisablingPropagation])

  // If we stack multiple modals and drawers on mobile then we shouldn't trap focus
  useLayoutEffect(() => {
    if (!isMobile || isLargerThanMd) return

    document.addEventListener('focusin', e => e.stopImmediatePropagation())
    document.addEventListener('focusout', e => e.stopImmediatePropagation())

    return () => {
      document.removeEventListener('focusin', e => e.stopImmediatePropagation())
      document.removeEventListener('focusout', e => e.stopImmediatePropagation())
    }
  }, [isLargerThanMd])

  if (isMobile || !isLargerThanMd) {
    return (
      <Drawer.Root
        repositionInputs={isFullScreen ? true : false}
        open={isDialogOpen}
        onClose={onClose}
        activeSnapPoint={isDisablingPropagation ? snapPoint : undefined}
        modal={false}
      >
        <Drawer.Portal>
          {!isDisablingPropagation ? (
            <Box
              bg='rgba(0, 0, 0, 0.8)'
              position='fixed'
              inset={0}
              zIndex='var(--chakra-zIndices-modal)'
              onClick={onClose}
            />
          ) : null}
          {isDisablingPropagation ? <CustomDrawerOverlay onClick={onClose} /> : null}
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
