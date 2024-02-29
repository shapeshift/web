import { Box, Modal, ModalContent, ModalOverlay, useMediaQuery } from '@chakra-ui/react'
import styled from '@emotion/styled'
import type { PropsWithChildren } from 'react'
import React from 'react'
import { Drawer } from 'vaul'
import { isMobile } from 'lib/globals'
import { breakpoints } from 'theme/theme'

type DialogProps = {
  isOpen: boolean
  onClose: () => void
} & PropsWithChildren

const CustomDrawerContent = styled(Drawer.Content)`
  background-color: var(--chakra-colors-background-surface-overlay-base);
  display: flex;
  flex-direction: column;
  border-radius: 24px 24px 0 0;
  height: auto;
  margin-top: 6rem;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: var(--chakra-zIndices-modal);
`

const CustomDrawerOverlay = styled(Drawer.Overlay)`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.8);
`

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, children }) => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })

  if (isMobile || !isLargerThanMd) {
    return (
      <Drawer.Root open={isOpen} onClose={onClose} shouldScaleBackground>
        <Drawer.Portal>
          <CustomDrawerOverlay />
          <CustomDrawerContent>
            <Box
              mx='auto'
              width='12'
              h='1.5'
              flexShrink={0}
              borderRadius='full'
              bg='text.subtlest'
              mb={4}
              mt={2}
            />
            {children}
          </CustomDrawerContent>
        </Drawer.Portal>
      </Drawer.Root>
    )
  }
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>{children}</ModalContent>
    </Modal>
  )
}
