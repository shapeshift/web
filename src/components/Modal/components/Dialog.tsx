import type { ModalProps } from '@chakra-ui/react'
import { Modal, ModalContent, ModalOverlay, useMediaQuery } from '@chakra-ui/react'
import styled from '@emotion/styled'
import type { PropsWithChildren } from 'react'
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Drawer } from 'vaul'

import {
  useDialog,
  withDialogProvider,
} from '@/context/DialogContextProvider/DialogContextProvider'
import { useModalRegistration } from '@/context/ModalStackProvider'
import { isMobile } from '@/lib/globals'
import { breakpoints } from '@/theme/theme'

export type DialogProps = {
  isOpen: boolean
  onClose: () => void
  height?: string
  isFullScreen?: boolean
  modalProps?: Omit<ModalProps, 'children' | 'isOpen' | 'onClose'>
  id: string
} & PropsWithChildren

const CustomDrawerContent = styled(Drawer.Content)<{ zIndex?: string }>`
  background-color: var(--chakra-colors-background-surface-base);
  display: flex;
  flex-direction: column;
  border-radius: 24px 24px 0 0;
  position: fixed;
  max-height: 95%;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: ${props => props.zIndex || 'var(--chakra-zIndices-modal)'};
`

const CustomDrawerOverlay = styled(Drawer.Overlay)<{ zIndex?: string }>`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.8);
  z-index: ${props => props.zIndex || 'var(--chakra-zIndices-overlay)'};

  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
`

const snapPoint = 0.5

const DialogWindow: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  height,
  isFullScreen,
  modalProps,
  children,
  id,
}) => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const { setIsOpen, isOpen: isDialogOpen } = useDialog()
  const {
    modalContentProps,
    overlayProps,
    modalProps: stackedModalProps,
    isHighestModal,
  } = useModalRegistration({
    isOpen,
    modalId: id,
    onClose,
  })

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
      maxHeight: isFullScreen
        ? '100vh'
        : 'calc(100% - env(safe-area-inset-top) - var(--safe-area-inset-top))',
      height: isFullScreen ? viewportHeight : height || '80vh',
      paddingTop: isFullScreen ? 'calc(env(safe-area-inset-top) + var(--safe-area-inset-top))' : 0,
      ...modalContentProps?.containerProps?.sx,
    }
  }, [height, isFullScreen, viewportHeight, modalContentProps])

  useEffect(() => {
    setIsOpen(isOpen)
  }, [isOpen, setIsOpen])

  const handleClose = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.stopPropagation()
      setIsOpen(false)
      onClose()
    },
    [onClose, setIsOpen],
  )

  // If we stack multiple modals and drawers on mobile then we shouldn't trap focus which is a bug from vaul
  useLayoutEffect(() => {
    if (isHighestModal) return

    document.addEventListener('focusin', e => e.stopImmediatePropagation())
    document.addEventListener('focusout', e => e.stopImmediatePropagation())

    return () => {
      document.removeEventListener('focusin', e => e.stopImmediatePropagation())
      document.removeEventListener('focusout', e => e.stopImmediatePropagation())
    }
  }, [isLargerThanMd, isHighestModal])

  if (isMobile || !isLargerThanMd) {
    return (
      <Drawer.Root
        repositionInputs={isFullScreen ? true : false}
        open={isDialogOpen}
        onClose={onClose}
        activeSnapPoint={snapPoint}
        modal
        disablePreventScroll={!isHighestModal}
        noBodyStyles={!isHighestModal}
      >
        <Drawer.Portal>
          <CustomDrawerOverlay onClick={handleClose} {...overlayProps} />
          <CustomDrawerContent {...contentStyle}>{children}</CustomDrawerContent>
        </Drawer.Portal>
      </Drawer.Root>
    )
  }
  return (
    <Modal isCentered {...modalProps} {...stackedModalProps}>
      <ModalOverlay {...overlayProps} />
      <ModalContent height={height} {...modalContentProps}>
        {children}
      </ModalContent>
    </Modal>
  )
}

export const Dialog = withDialogProvider(DialogWindow)
