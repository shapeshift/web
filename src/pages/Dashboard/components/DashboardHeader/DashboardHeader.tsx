import { Container, Stack, useDisclosure } from '@chakra-ui/react'
import { useScroll } from 'framer-motion'
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'

import { DashboardDrawer } from './DashboardDrawer'
import { DashboardHeaderTop } from './DashboardHeaderTop'
import { DashboardHeaderWrapper } from './DashboardHeaderWrapper'
import { MobileUserHeader } from './MobileUserHeader'

import { Display } from '@/components/Display'
import { GlobalSearchModal } from '@/components/Layout/Header/GlobalSearch/GlobalSearchModal'
import { MobileWalletDialogRoutes } from '@/components/MobileWalletDialog/types'
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

export const DashboardHeader = memo(() => {
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
    if (isMobileApp)
      return mobileWalletDialog.open({ defaultRoute: MobileWalletDialogRoutes.Saved })

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
        </Stack>
      </DashboardHeaderWrapper>
    </>
  )
})
