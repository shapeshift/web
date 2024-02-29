import type { ResponsiveValue } from '@chakra-ui/react'
import { Container, Flex } from '@chakra-ui/react'
import type { Property } from 'csstype'
import type { PropsWithChildren } from 'react'
import { useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router'

import { MenuTab } from './MenuTab'

export type TabItem = {
  label: string
  path: string
  color: string
  exact?: boolean
  rightElement?: JSX.Element
  hide?: boolean
}
const alignChildren = { base: 'flex-start', lg: 'center' }
const justifyContent = { base: 'flex-start', lg: 'flex-end' }
const flexDirTabs: ResponsiveValue<Property.FlexDirection> = { base: 'column-reverse', lg: 'row' }
const navItemPadding = { base: 4, '2xl': 8 }
const navCss = {
  '&::-webkit-scrollbar': {
    display: 'none',
  },
}

type TabMenuProps = {
  items: TabItem[]
} & PropsWithChildren

export const TabMenu: React.FC<TabMenuProps> = ({ items, children }) => {
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
    <Flex borderBottomWidth={1} borderColor='border.base' marginBottom='-1px' gap={8}>
      <Container
        maxWidth='container.4xl'
        display='flex'
        alignItems='center'
        gap={8}
        justifyContent='space-between'
        flexDir={flexDirTabs}
        px={navItemPadding}
      >
        <Container
          ref={containerRef}
          maxWidth='container.4xl'
          className='navbar-scroller'
          overflowY='auto'
          display='flex'
          gap={8}
          px={0}
          css={navCss}
        >
          {renderNavItems}
        </Container>
        {children && (
          <Flex width='full' alignItems={alignChildren} gap={2} justifyContent={justifyContent}>
            {children}
          </Flex>
        )}
      </Container>
    </Flex>
  )
}
