import type { ResponsiveValue } from '@chakra-ui/react'
import { Container, Flex } from '@chakra-ui/react'
import type { Property } from 'csstype'
import type { JSX } from 'react'
import { useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'

import { MenuTab } from './MenuTab'

export type TabItem = {
  label: string
  path: string
  color: string
  exact?: boolean
  rightElement?: JSX.Element
  hide?: boolean
}

const flexDirTabs: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const navCss = {
  '&::-webkit-scrollbar': {
    display: 'none',
  },
}

type TabMenuProps = {
  items: TabItem[]
}

export const TabMenu: React.FC<TabMenuProps> = ({ items }) => {
  const location = useLocation()
  const activeRef = useRef<HTMLButtonElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }
  }, [location])

  const renderNavItems = useMemo(() => {
    return items
      .filter(item => !item.hide)
      .map(navItem => (
        <MenuTab
          key={navItem.label}
          label={navItem.label}
          path={navItem.path}
          ref={location.pathname === navItem.path ? activeRef : null}
          color={navItem.color}
          rightElement={navItem.rightElement}
          exact={navItem.exact}
        />
      ))
  }, [items, location.pathname])

  return (
    <Flex
      flexDir={flexDirTabs}
      borderBottomWidth={1}
      borderColor='border.base'
      marginBottom='-1px'
      gap={8}
      position='sticky'
      top='72px'
    >
      <Container
        ref={containerRef}
        className='navbar-scroller'
        display='flex'
        gap={8}
        overflowY='auto'
        css={navCss}
      >
        {renderNavItems}
      </Container>
    </Flex>
  )
}
