import { useDisclosure, useMediaQuery } from '@chakra-ui/react'
import { Rail } from 'components/Layout/Rail'
import React from 'react'

export type LeftSidebarChildProps = {
  isOpen?: boolean
  onToggle?(): void
  onClose?(): void
}

export const LeftSidebar: React.FC = ({ children }) => {
  const [isLargerThan1280] = useMediaQuery('(min-width: 1280px)')
  const { isOpen, onToggle, onClose } = useDisclosure()
  return isLargerThan1280 ? (
    <Rail as='nav' aria-label='Main Navigation' display={{ base: 'none', lg: 'flex' }}>
      {React.Children.map(children, child =>
        React.isValidElement(child)
          ? React.cloneElement(child, { onToggle, onClose, isOpen })
          : null
      )}
    </Rail>
  ) : null
}
