import { useDisclosure, useMediaQuery } from '@chakra-ui/react'
import React from 'react'
import { Route } from 'Routes/helpers'
import { Rail } from 'components/Layout/Rail'

export type LeftSidebarChildProps = {
  isOpen?: boolean
  onToggle?(): void
  onClose?(): void
  route?: Route
}

export const LeftSidebar: React.FC<LeftSidebarChildProps> = ({ route, children }) => {
  const [isLargerThan1280] = useMediaQuery('(min-width: 1280px)')
  const { isOpen, onToggle, onClose } = useDisclosure()
  return isLargerThan1280 ? (
    <Rail as='nav' aria-label='Main Navigation' display={{ base: 'none', lg: 'flex' }}>
      {React.Children.map(children, child =>
        React.isValidElement(child)
          ? React.cloneElement(child, { onToggle, onClose, isOpen, route })
          : null
      )}
    </Rail>
  ) : null
}
