import { Box, Divider, Flex, HStack, Link, Text, useMediaQuery } from '@chakra-ui/react'
import { useScroll } from 'framer-motion'
import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import {
  TbArrowRight,
  TbBuildingBank,
  TbCreditCard,
  TbGraph,
  TbLayersSelected,
  TbPool,
  TbRefresh,
  TbStack,
  TbTrendingUp,
} from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Link as ReactRouterLink, useNavigate } from 'react-router-dom'

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
const fullSearchMediaQuery = '@media screen and (min-width: 1540px)'
const searchBoxSx = { display: 'none', [fullSearchMediaQuery]: { display: 'flex' } }
const iconButtonSx = { display: 'flex', [fullSearchMediaQuery]: { display: 'none' } }

const baseTradeSubMenuItems = [
  { label: 'navBar.swap', path: '/trade', icon: TbRefresh },
  { label: 'limitOrder.heading', path: '/limit', icon: TbLayersSelected },
  { label: 'fiatRamps.buy', path: '/ramp/buy', icon: TbCreditCard },
  { label: 'fiatRamps.sell', path: '/ramp/sell', icon: TbArrowRight },
]

const exploreSubMenuItems = [
  { label: 'navBar.tokens', path: '/assets', icon: TbStack },
  { label: 'navBar.markets', path: '/markets', icon: TbGraph },
]

export const Header = memo(() => {
  const isDegradedState = useSelector(selectPortfolioDegradedState)
  const translate = useTranslate()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)
  const isYieldXyzEnabled = useFeatureFlag('YieldXyz')
  const isYieldsPageEnabled = useFeatureFlag('YieldsPage')

  const navigate = useNavigate()
  const {
    state: { isConnected, walletInfo },
  } = useWallet()
  const [y, setY] = useState(0)
  const { scrollY } = useScroll()

  useEffect(() => {
    return scrollY.on('change', () => setY(scrollY.get()))
  }, [scrollY])

  const isScrolled = y > 0

  // masks the area behind and around the header so scrolling content can't show through it - kept
  // permanently opaque (it matches the body background) so it never lags behind fast scrolls
  const backdropSx = useMemo(
    () => ({
      content: '""',
      position: 'absolute' as const,
      top: '-1rem',
      left: '-1rem',
      right: '-1rem',
      bottom: 0,
      bg: 'background.surface.base',
      borderBottom: '1px solid',
      borderBottomColor: isScrolled ? 'border.base' : 'transparent',
      zIndex: -1,
    }),
    [isScrolled],
  )

  const isWalletConnectToDappsV2Enabled = useFeatureFlag('WalletConnectToDappsV2')
  const isActionCenterEnabled = useFeatureFlag('ActionCenter')
  const isNewWalletManagerEnabled = useFeatureFlag('NewWalletManager')
  const isEarnTabEnabled = useFeatureFlag('EarnTab')
  const isChainflipLendingEnabled = useFeatureFlag('ChainflipLending')

  const tradeSubMenuItems = useMemo(
    () =>
      isEarnTabEnabled
        ? [...baseTradeSubMenuItems, { label: 'navBar.earn', path: '/earn', icon: TbTrendingUp }]
        : baseTradeSubMenuItems,
    [isEarnTabEnabled],
  )
  const { degradedChainIds } = useDiscoverAccounts()

  const hasWallet = Boolean(walletInfo?.deviceId)
  const earnSubMenuItems = useMemo(() => {
    const items = [
      ...(isYieldsPageEnabled
        ? [{ label: 'navBar.yields', path: '/yields', icon: TbTrendingUp, isNew: true }]
        : []),
      { label: 'navBar.tcy', path: '/tcy', icon: TCYIcon },
      { label: 'navBar.pools', path: '/pools', icon: TbPool },
      ...(isChainflipLendingEnabled
        ? [
            {
              label: 'navBar.chainflipLending',
              path: '/chainflip-lending',
              icon: TbBuildingBank,
              isNew: true,
            },
          ]
        : []),
    ]

    return items
  }, [isChainflipLendingEnabled, isYieldsPageEnabled])

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
        _before={backdropSx}
        marginTop={2}
        mx={2}
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
              <NavigationDropdown
                label='defi.earn'
                items={earnSubMenuItems}
                defaultPath={isYieldXyzEnabled && isYieldsPageEnabled ? '/yields' : '/tcy'}
              />
              <Link
                as={ReactRouterLink}
                to={'/fox-ecosystem'}
                fontWeight='medium'
                color='text.subtle'
                _hover={{ color: 'text.base', textDecoration: 'none' }}
              >
                <Text>{translate('navBar.ecosystem')}</Text>
              </Link>
            </HStack>
          </HStack>

          {/* Middle section - search box */}
          <Box width='300px' mx={4} sx={searchBoxSx}>
            <GlobalSearchButton />
          </Box>

          {/* Right section - equal width to left */}
          <HStack spacing={rightHStackSpacingSx} flex='1' justifyContent='flex-end' minW={0}>
            <Box sx={iconButtonSx}>
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
