import { Box, Flex, HStack, useMediaQuery } from '@chakra-ui/react'
import { useScroll } from 'framer-motion'
import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import { ActionCenter } from './ActionCenter/ActionCenter'
import { AppLoadingIcon } from './AppLoadingIcon'
import { DegradedStateBanner } from './DegradedStateBanner'
import { GlobalSeachButton } from './GlobalSearch/GlobalSearchButton'
import { ChainMenu } from './NavBar/ChainMenu'
import { MobileNavBar } from './NavBar/MobileNavBar'
import { UserMenu } from './NavBar/UserMenu'
import { WalletManagerPopover } from './NavBar/WalletManagerPopover'
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

const pxProp = { base: 0, xl: 4 }
const displayProp = { base: 'block', md: 'none' }
const displayProp2 = { base: 'none', md: 'block' }
const widthProp = { base: 'auto', md: 'full' }
const paddingTopProp = {
  base: 'calc(env(safe-area-inset-top) + var(--safe-area-inset-top))',
  md: 0,
}

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
  const isNewWalletManagerEnabled = useFeatureFlag('NewWalletManager')
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
        width='full'
        position='sticky'
        zIndex='banner'
        ref={ref}
        bg={y > height ? 'background.surface.base' : 'transparent'}
        transitionDuration='200ms'
        transitionProperty='all'
        transitionTimingFunction='cubic-bezier(0.4, 0, 0.2, 1)'
        top={0}
        paddingTop={paddingTopProp}
      >
        <HStack height='4.5rem' width='full' px={4}>
          <HStack width='full' margin='0 auto' px={pxProp} spacing={0} columnGap={4}>
            <Box display={displayProp} mx='auto'>
              <AppLoadingIcon />
            </Box>

            <Flex
              justifyContent='flex-end'
              alignItems='center'
              width={widthProp}
              flex={1}
              rowGap={4}
              columnGap={2}
            >
              <GlobalSeachButton />
              {isLargerThanMd && (isDegradedState || degradedChainIds.length > 0) && (
                <DegradedStateBanner />
              )}
              {isLargerThanMd && isWalletConnectToDappsV2Enabled && (
                <Suspense>
                  <WalletConnectToDappsHeaderButton />
                </Suspense>
              )}
              {isLargerThanMd && <ChainMenu display={displayProp2} />}
              {isConnected && !isActionCenterEnabled && <TxWindow />}
              {isConnected && isActionCenterEnabled && <ActionCenter />}
              {isLargerThanMd && (
                <Box display={displayProp2}>
                  {isNewWalletManagerEnabled ? <WalletManagerPopover /> : <UserMenu />}
                </Box>
              )}
            </Flex>
          </HStack>
        </HStack>
      </Flex>
      <MobileNavBar />
    </>
  )
})
