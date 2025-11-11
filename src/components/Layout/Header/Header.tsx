import { Box, Divider, Flex, HStack, useMediaQuery } from '@chakra-ui/react'
import { useScroll } from 'framer-motion'
import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  TbArrowRight,
  TbBuildingBank,
  TbCreditCard,
  TbGraph,
  TbLayersSelected,
  TbPool,
  TbRefresh,
  TbStack,
} from 'react-icons/tb'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import { ActionCenter } from './ActionCenter/ActionCenter'
import { DegradedStateBanner } from './DegradedStateBanner'
import { GlobalSearchButton } from './GlobalSearch/GlobalSearchButton'
import { ChainMenu } from './NavBar/ChainMenu'
import { MobileNavBar } from './NavBar/MobileNavBar'
import { NavigationDropdown } from './NavBar/NavigationDropdown'
import { ShapeShiftMenu } from './NavBar/ShapeShiftMenu'
import { UserMenu } from './NavBar/UserMenu'
import { WalletManagerDrawer } from './NavBar/WalletManagerDrawer'
import { SettingsMenu } from './SettingsMenu'
import { TxWindow } from './TxWindow/TxWindow'

import { TCYIcon } from '@/components/Icons/TCYIcon'
import { useDiscoverAccounts } from '@/context/AppProvider/hooks/useDiscoverAccounts'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { selectPortfolioDegradedState } from '@/state/slices/selectors'
import { breakpoints } from '@/theme/theme'

const WalletConnectToDappsHeaderButton = lazy(() =>
  import('@/plugins/walletConnectToDapps/components/header/WalletConnectToDappsHeaderButton').then(
    ({ WalletConnectToDappsHeaderButton }) => ({ default: WalletConnectToDappsHeaderButton }),
  ),
)

const displayProp2 = { base: 'none', md: 'block' }
const paddingTopProp = {
  base: 'calc(env(safe-area-inset-top) + var(--safe-area-inset-top))',
  md: 0,
}

const leftHStackSpacingSx = { base: 4, lg: 8 }
const navHStackSpacingSx = { base: 3, lg: 6 }
const navHStackDisplaySx = { base: 'none', md: 'flex' }
const rightHStackSpacingSx = { base: 2, lg: 4 }

// Search box responsive styles
const searchBoxMaxWSx = { base: 'auto', lg: '400px' }
const searchBoxMinWSx = { base: 'auto', xl: '300px' }

const tradeSubMenuItems = [
  { label: 'navBar.swap', path: '/trade', icon: TbRefresh },
  { label: 'limitOrder.heading', path: '/limit', icon: TbLayersSelected },
  { label: 'fiatRamps.buy', path: '/ramp/buy', icon: TbCreditCard },
  { label: 'fiatRamps.sell', path: '/ramp/sell', icon: TbArrowRight },
]

const exploreSubMenuItems = [
  { label: 'navBar.tokens', path: '/assets', icon: TbStack },
  { label: 'navBar.markets', path: '/markets', icon: TbGraph },
]

const earnSubMenuItems = [
  { label: 'navBar.tcy', path: '/tcy', icon: TCYIcon },
  { label: 'navBar.pools', path: '/pools', icon: TbPool },
  { label: 'navBar.lending', path: '/lending', icon: TbBuildingBank },
]

export const Header = memo(() => {
  const isDegradedState = useSelector(selectPortfolioDegradedState)
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)

  const navigate = useNavigate()
  const {
    state: { isConnected, walletInfo },
  } = useWallet()
  const ref = useRef<HTMLDivElement>(null)
  const [y, setY] = useState(0)
  const height = useMemo(() => ref.current?.getBoundingClientRect()?.height ?? 0, [])
  const { scrollY } = useScroll()

  // Responsive display based on viewport width
  const searchBoxDisplay = useMemo(
    () => ({
      base: 'none',
      '2xl': 'flex',
      // Hide at smaller breakpoints where it would get cramped
      xl: 'none',
    }),
    [],
  )

  const iconButtonDisplay = useMemo(
    () => ({
      base: 'flex',
      '2xl': 'none',
    }),
    [],
  )

  useEffect(() => {
    return scrollY.onChange(() => setY(scrollY.get()))
  }, [scrollY])

  const isWalletConnectToDappsV2Enabled = useFeatureFlag('WalletConnectToDappsV2')
  const isActionCenterEnabled = useFeatureFlag('ActionCenter')
  const isNewWalletManagerEnabled = useFeatureFlag('NewWalletManager')
  const { degradedChainIds } = useDiscoverAccounts()

  const hasWallet = Boolean(walletInfo?.deviceId)

  /**
   * FOR DEVELOPERS:
   * Open the hidden flags menu via keypress
   */
  const handleKeyPress = useCallback(
    (event: { altKey: unknown; shiftKey: unknown; keyCode: number }) => {
      if (event.altKey && event.shiftKey && event.keyCode === 70) {
        navigate('/flags')
      }
    },
    [navigate],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])

  if (!isLargerThanMd) return null

  return (
    <>
      <Flex
        direction='column'
        position='sticky'
        zIndex='banner'
        ref={ref}
        bg={y > height ? 'background.surface.base' : 'transparent'}
        border='1px solid'
        borderColor={y > height ? 'border.base' : 'transparent'}
        borderRadius='2xl'
        marginTop={2}
        mx={2}
        transitionDuration='200ms'
        transitionProperty='all'
        transitionTimingFunction='cubic-bezier(0.4, 0, 0.2, 1)'
        top={2}
        paddingTop={paddingTopProp}
      >
        <HStack height='4.5rem' width='full' pr={4} pl={6}>
          {/* Left section - equal width to right */}
          <HStack spacing={leftHStackSpacingSx} flex='1' minW={0}>
            <ShapeShiftMenu />
            <HStack spacing={navHStackSpacingSx} display={navHStackDisplaySx}>
              <NavigationDropdown
                label='common.trade'
                items={tradeSubMenuItems}
                defaultPath='/trade'
              />
              <NavigationDropdown
                label='navBar.explore'
                items={exploreSubMenuItems}
                defaultPath='/assets'
              />
              <NavigationDropdown label='defi.earn' items={earnSubMenuItems} defaultPath='/tcy' />
            </HStack>
          </HStack>

          {/* Middle section - search box */}
          <Box maxW={searchBoxMaxWSx} minW={searchBoxMinWSx} mx={4} display={searchBoxDisplay}>
            <GlobalSearchButton />
          </Box>

          {/* Right section - equal width to left */}
          <HStack spacing={rightHStackSpacingSx} flex='1' justifyContent='flex-end' minW={0}>
            <Box display={iconButtonDisplay}>
              <GlobalSearchButton isIconButton />
            </Box>
            {isLargerThanMd && (isDegradedState || degradedChainIds.length > 0) && (
              <DegradedStateBanner />
            )}
            {isLargerThanMd && isWalletConnectToDappsV2Enabled && (
              <Suspense>
                <WalletConnectToDappsHeaderButton />
              </Suspense>
            )}
            {isConnected && !isActionCenterEnabled && <TxWindow />}
            {isConnected && isActionCenterEnabled && <ActionCenter />}
            {!isConnected && <SettingsMenu />}
            {hasWallet && (
              <Divider orientation='vertical' height='24px' borderColor='border.bold' />
            )}
            {isLargerThanMd && <ChainMenu display={displayProp2} />}
            {isLargerThanMd && (
              <Box display={displayProp2}>
                {isNewWalletManagerEnabled ? <WalletManagerDrawer /> : <UserMenu />}
              </Box>
            )}
          </HStack>
        </HStack>
      </Flex>
      <MobileNavBar />
    </>
  )
})
