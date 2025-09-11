import type { ResponsiveValue } from '@chakra-ui/react'
import { Container, Flex, Stack, useColorModeValue, useDisclosure } from '@chakra-ui/react'
import type { Property } from 'csstype'
import { useScroll } from 'framer-motion'
import type { JSX } from 'react'
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { DashboardTab } from '../DashboardTab'
import { DashboardDrawer } from './DashboardDrawer'
import { DashboardHeaderTop } from './DashboardHeaderTop'
import { DashboardHeaderWrapper } from './DashboardHeaderWrapper'
import { MobileUserHeader } from './MobileUserHeader'

import { Display } from '@/components/Display'
import { GlobalSearchModal } from '@/components/Layout/Header/GlobalSearch/GlobalSearchModal'
import { useModal } from '@/hooks/useModal/useModal'
import { isMobile as isMobileApp } from '@/lib/globals'

const paddingTop = {
  base: 'calc(env(safe-area-inset-top) + var(--safe-area-inset-top))',
  md: '4.5rem',
}
const marginTop = { base: 0, md: '-4.5rem' }
const borderBottomWidth = { base: 0, md: 1 }

// If we set this to 0, the transparent background will cause some weird flickering when scrolling back to 0 or opening the drawer
const TRIGGER_BACKGROUND_HEIGHT_Y = 2

export type TabItem = {
  label: string
  path: string
  color: string
  exact?: boolean
  rightElement?: JSX.Element
  hide?: boolean
}

const flexDirTabs: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const navItemPadding = { base: 6, '2xl': 8 }
const navCss = {
  '&::-webkit-scrollbar': {
    display: 'none',
  },
}

export const DashboardHeader = memo(() => {
  const location = useLocation()
  const activeRef = useRef<HTMLButtonElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const mobileWalletDialog = useModal('mobileWalletDialog')
  const qrCode = useModal('qrCode')

  const [y, setY] = useState(0)
  const { scrollY } = useScroll()

  useEffect(() => {
    return scrollY.onChange(() => setY(scrollY.get()))
  }, [scrollY])

  const handleQrCodeClick = useCallback(() => {
    qrCode.open({})
  }, [qrCode])

  const {
    isOpen: isSearchOpen,
    onClose: onSearchClose,
    onOpen: onSearchOpen,
    onToggle: onSearchToggle,
  } = useDisclosure()

  const { isOpen, onClose, onOpen } = useDisclosure()

  const borderColor = useColorModeValue('gray.100', 'whiteAlpha.200')

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }
  }, [location])

  const NavItems: TabItem[] = useMemo(() => {
    return [
      {
        label: 'common.overview',
        path: '/wallet',
        color: 'blue',
        exact: true,
      },
      {
        label: 'navBar.wallet',
        path: '/wallet/accounts',
        color: 'blue',
      },
      {
        label: 'navBar.defi',
        path: '/wallet/earn',
        color: 'purple',
      },
      {
        label: 'common.activity',
        path: '/wallet/activity',
        color: 'blue',
      },
    ]
  }, [])

  const renderNavItems = useMemo(() => {
    return NavItems.filter(item => !item.hide).map(navItem => (
      <DashboardTab
        key={navItem.label}
        label={navItem.label}
        path={navItem.path}
        ref={location.pathname === navItem.path ? activeRef : null}
        color={navItem.color}
        rightElement={navItem.rightElement}
        exact={navItem.exact}
      />
    ))
  }, [NavItems, location.pathname])

  const tabs = useMemo(() => {
    return (
      <Flex
        flexDir={flexDirTabs}
        borderBottomWidth={0}
        borderColor={borderColor}
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
          px={navItemPadding}
          overflowY='auto'
          css={navCss}
        >
          {renderNavItems}
        </Container>
      </Flex>
    )
  }, [borderColor, renderNavItems])

  useLayoutEffect(() => {
    const body = document.body
    const header = document.querySelector('.dashboard-header')
    if (window.visualViewport) {
      const vv = window.visualViewport
      const fixPosition = () => {
        if (body && header) {
          body.style.setProperty('--mobile-header-offset', `${header.clientHeight}px`)
        }
      }
      vv.addEventListener('resize', fixPosition)
      fixPosition()
      return () => {
        window.removeEventListener('resize', fixPosition)
      }
    }
  }, [])

  const mobileDrawer = useMemo(() => {
    // Inside mobile app, we use the global modal provider for the mobile wallet dialog, so we don't need to render the drawer here
    if (isMobileApp) return null

    // But on responsive we use the regular drawer
    return <DashboardDrawer isOpen={isOpen} onClose={onClose} />
  }, [isOpen, onClose])

  const handleUserHeaderClick = useCallback(() => {
    if (isMobileApp) return mobileWalletDialog.open({})

    onOpen()
  }, [mobileWalletDialog, onOpen])

  return (
    <>
      <Display.Mobile>
        <Container
          px={4}
          position='fixed'
          top='0'
          pt='calc(env(safe-area-inset-top) + var(--safe-area-inset-top) + var(--chakra-space-4))'
          zIndex='banner'
          bg={y > TRIGGER_BACKGROUND_HEIGHT_Y ? 'background.surface.base' : 'transparent'}
          pb={4}
          maxWidth='100%'
        >
          <MobileUserHeader
            onSearchOpen={onSearchOpen}
            handleQrCodeClick={handleQrCodeClick}
            onOpen={handleUserHeaderClick}
          />
        </Container>

        <GlobalSearchModal
          isOpen={isSearchOpen}
          onClose={onSearchClose}
          onOpen={onSearchOpen}
          onToggle={onSearchToggle}
        />
        {mobileDrawer}
      </Display.Mobile>
      <DashboardHeaderWrapper>
        <Stack
          spacing={0}
          borderColor='border.base'
          borderBottomWidth={borderBottomWidth}
          pt={paddingTop}
          mt={marginTop}
        >
          <DashboardHeaderTop />
          <Display.Desktop>{tabs}</Display.Desktop>
        </Stack>
      </DashboardHeaderWrapper>
    </>
  )
})
