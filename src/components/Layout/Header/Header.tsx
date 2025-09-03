import { Box, Divider, Flex, HStack, useMediaQuery } from '@chakra-ui/react'
import { useScroll } from 'framer-motion'
import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FaArrowRight, FaCreditCard } from 'react-icons/fa'
import { RiRefreshLine } from 'react-icons/ri'
import { TbChartHistogram } from 'react-icons/tb'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import { ActionCenter } from './ActionCenter/ActionCenter'
import { DegradedStateBanner } from './DegradedStateBanner'
import { GlobalSeachButton } from './GlobalSearch/GlobalSearchButton'
import { ChainMenu } from './NavBar/ChainMenu'
import { MobileNavBar } from './NavBar/MobileNavBar'
import { NavigationDropdown } from './NavBar/NavigationDropdown'
import { ShapeShiftMenu } from './NavBar/ShapeShiftMenu'
import { UserMenu } from './NavBar/UserMenu'
import { TxWindow } from './TxWindow/TxWindow'

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

// Navigation links for horizontal navbar
const tradeSubMenuItems = [
  { label: 'Swap', path: '/trade', icon: RiRefreshLine },
  { label: 'Limit', path: '/limit', icon: TbChartHistogram },
  { label: 'Buy', path: '/ramp/buy', icon: FaCreditCard },
  { label: 'Sell', path: '/ramp/sell', icon: FaArrowRight },
]

const exploreSubMenuItems = [
  { label: 'Tokens', path: '/assets' },
  { label: 'Markets', path: '/markets' },
]

const earnSubMenuItems = [
  { label: 'TCY', path: '/tcy' },
  { label: 'Pools', path: '/pools' },
  { label: 'Lending', path: '/lending' },
]

export const Header = memo(() => {
  const isDegradedState = useSelector(selectPortfolioDegradedState)
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)

  const navigate = useNavigate()
  const {
    state: { isConnected },
  } = useWallet()
  const ref = useRef<HTMLDivElement>(null)
  const [y, setY] = useState(0)
  const height = useMemo(() => ref.current?.getBoundingClientRect()?.height ?? 0, [])
  const { scrollY } = useScroll()

  useEffect(() => {
    return scrollY.onChange(() => setY(scrollY.get()))
  }, [scrollY])

  const isWalletConnectToDappsV2Enabled = useFeatureFlag('WalletConnectToDappsV2')
  const isActionCenterEnabled = useFeatureFlag('ActionCenter')
  const { degradedChainIds } = useDiscoverAccounts()

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

  // Hide the header on mobile
  if (!isLargerThanMd) return null

  return (
    <>
      <Flex
        direction='column'
        width='calc(100% - 32px)'
        position='sticky'
        zIndex='banner'
        ref={ref}
        bg={y > height ? 'background.surface.base' : 'transparent'}
        border='1px solid'
        borderColor='border.base'
        borderRadius='lg'
        margin='4'
        transitionDuration='200ms'
        transitionProperty='all'
        transitionTimingFunction='cubic-bezier(0.4, 0, 0.2, 1)'
        top={0}
        paddingTop={paddingTopProp}
      >
        <HStack height='4.5rem' width='full' px={4} justifyContent='space-between'>
          {/* Left side - Logo and Navigation */}
          <HStack spacing={8}>
            <ShapeShiftMenu />
            <HStack spacing={6}>
              <NavigationDropdown label='Trade' items={tradeSubMenuItems} defaultPath='/trade' />
              <NavigationDropdown
                label='Explore'
                items={exploreSubMenuItems}
                defaultPath='/assets'
              />
              <NavigationDropdown label='Earn' items={earnSubMenuItems} defaultPath='/tcy' />
            </HStack>
          </HStack>

          {/* Center - Search */}
          <Box flex={1} maxWidth='400px' mx={8}>
            <GlobalSeachButton />
          </Box>

          {/* Right side - Actions */}
          <HStack spacing={4}>
            {/* Hide degraded state and connect dapp buttons for now */}
            {false && isLargerThanMd && (isDegradedState || degradedChainIds.length > 0) && (
              <DegradedStateBanner />
            )}
            {false && isLargerThanMd && isWalletConnectToDappsV2Enabled && (
              <Suspense>
                <WalletConnectToDappsHeaderButton />
              </Suspense>
            )}
            {isLargerThanMd && <ChainMenu display={displayProp2} />}
            {isConnected && !isActionCenterEnabled && <TxWindow />}
            {isConnected && isActionCenterEnabled && <ActionCenter />}
            <Divider orientation='vertical' height='24px' borderColor='whiteAlpha.300' />
            {isLargerThanMd && (
              <Box display={displayProp2}>
                <UserMenu />
              </Box>
            )}
          </HStack>
        </HStack>
      </Flex>
      <MobileNavBar />
    </>
  )
})
