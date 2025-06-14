import { Box, Flex, HStack, useMediaQuery, usePrevious, useToast } from '@chakra-ui/react'
import { btcAssetId, fromAccountId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { MetaMaskMultiChainHDWallet } from '@shapeshiftoss/hdwallet-metamask-multichain'
import { useScroll } from 'framer-motion'
import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import { ActionCenter } from './ActionCenter/ActionCenter'
import { AppLoadingIcon } from './AppLoadingIcon'
import { DegradedStateBanner } from './DegradedStateBanner'
import { GlobalSeachButton } from './GlobalSearch/GlobalSearchButton'
import { ChainMenu } from './NavBar/ChainMenu'
import { MobileNavBar } from './NavBar/MobileNavBar'
import { UserMenu } from './NavBar/UserMenu'
import { TxWindow } from './TxWindow/TxWindow'

import { WalletActions } from '@/context/WalletProvider/actions'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { METAMASK_RDNS } from '@/lib/mipd'
import { selectWalletRdns } from '@/state/slices/localWalletSlice/selectors'
import { portfolio } from '@/state/slices/portfolioSlice/portfolioSlice'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import {
  selectEnabledWalletAccountIds,
  selectPortfolioDegradedState,
  selectWalletId,
} from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'
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
  const snapModal = useModal('snaps')
  const { isSnapInstalled, isCorrectVersion } = useIsSnapInstalled()
  const previousSnapInstall = usePrevious(isSnapInstalled)
  const previousIsCorrectVersion = usePrevious(isCorrectVersion)
  const showSnapModal = useSelector(preferences.selectors.selectShowSnapsModal)
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)

  const navigate = useNavigate()
  const {
    state: { isConnected, wallet },
    dispatch,
  } = useWallet()
  const appDispatch = useAppDispatch()
  const translate = useTranslate()
  const ref = useRef<HTMLDivElement>(null)
  const [y, setY] = useState(0)
  const height = useMemo(() => ref.current?.getBoundingClientRect()?.height ?? 0, [])
  const { scrollY } = useScroll()
  const toast = useToast()
  useEffect(() => {
    return scrollY.onChange(() => setY(scrollY.get()))
  }, [scrollY])

  const isWalletConnectToDappsV2Enabled = useFeatureFlag('WalletConnectToDappsV2')
  const isActionCenterEnabled = useFeatureFlag('ActionCenter')

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

  const connectedRdns = useAppSelector(selectWalletRdns)
  const previousConnectedRdns = usePrevious(connectedRdns)
  const currentWalletId = useAppSelector(selectWalletId)
  const walletAccountIds = useAppSelector(selectEnabledWalletAccountIds)
  const hasNonEvmAccountIds = useMemo(
    () => walletAccountIds.some(accountId => !isEvmChainId(fromAccountId(accountId).chainId)),
    [walletAccountIds],
  )

  useEffect(() => {
    const isMetaMaskMultichainWallet = wallet instanceof MetaMaskMultiChainHDWallet
    if (!(currentWalletId && isMetaMaskMultichainWallet && isSnapInstalled === false)) return

    // We have just detected that the user doesn't have the snap installed currently
    // We need to check whether or not the user had previous non-EVM AccountIds and clear those
    if (hasNonEvmAccountIds) appDispatch(portfolio.actions.clearWalletMetadata(currentWalletId))
  }, [appDispatch, currentWalletId, hasNonEvmAccountIds, isSnapInstalled, wallet, walletAccountIds])

  useEffect(() => {
    if (!isCorrectVersion && isSnapInstalled) return
    if (snapModal.isOpen) return

    if (
      previousSnapInstall === true &&
      isSnapInstalled === false &&
      previousIsCorrectVersion === true
    ) {
      if (previousConnectedRdns === METAMASK_RDNS && connectedRdns === METAMASK_RDNS) {
        // they uninstalled the snap
        toast({
          status: 'success',
          title: translate('walletProvider.metaMaskSnap.snapUninstalledToast'),
          position: 'bottom',
        })
      }
      const walletId = currentWalletId
      if (!walletId) return
      appDispatch(portfolio.actions.clearWalletMetadata(walletId))
      if (previousConnectedRdns === METAMASK_RDNS && connectedRdns === METAMASK_RDNS) {
        return snapModal.open({ isRemoved: true })
      }
    }
    if (
      previousSnapInstall === false &&
      isSnapInstalled === true &&
      previousConnectedRdns === METAMASK_RDNS &&
      connectedRdns === METAMASK_RDNS
    ) {
      navigate(`/assets/${btcAssetId}`)

      // they installed the snap
      toast({
        status: 'success',
        title: translate('walletProvider.metaMaskSnap.snapInstalledToast'),
        position: 'bottom',
      })
      return dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    }
  }, [
    appDispatch,
    connectedRdns,
    currentWalletId,
    dispatch,
    navigate,
    isCorrectVersion,
    isSnapInstalled,
    previousConnectedRdns,
    previousIsCorrectVersion,
    previousSnapInstall,
    showSnapModal,
    snapModal,
    toast,
    translate,
    wallet,
    walletAccountIds,
  ])

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
              {isLargerThanMd && isDegradedState && <DegradedStateBanner />}
              {isLargerThanMd && isWalletConnectToDappsV2Enabled && (
                <Suspense>
                  <WalletConnectToDappsHeaderButton />
                </Suspense>
              )}
              {isLargerThanMd && <ChainMenu display={displayProp2} />}
              {isConnected && <TxWindow />}
              {isConnected && isActionCenterEnabled && <ActionCenter />}
              {isLargerThanMd && (
                <Box display={displayProp2}>
                  <UserMenu />
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
