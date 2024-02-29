import { Modal, ModalContent, ModalOverlay, useMediaQuery } from '@chakra-ui/react'
import styled from '@emotion/styled'
import type { PropsWithChildren } from 'react'
import React from 'react'
import Sheet from 'react-modal-sheet'
import { isMobile } from 'lib/globals'
import { breakpoints } from 'theme/theme'

type DialogProps = {
  isOpen: boolean
  onClose: () => void
} & PropsWithChildren

const CustomSheet = styled(Sheet)`
  .react-modal-sheet-container {
    background-color: var(--chakra-colors-background-surface-overlay-base) !important;
  }
`

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, children }) => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })

  if (isMobile || !isLargerThanMd) {
    return (
      <CustomSheet isOpen={isOpen} onClose={onClose} detent='content-height'>
        <Sheet.Container>
          <Sheet.Header />
          {children}
        </Sheet.Container>
        <Sheet.Backdrop />
      </CustomSheet>
    )
  }
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>{children}</ModalContent>
    </Modal>
  )
}
