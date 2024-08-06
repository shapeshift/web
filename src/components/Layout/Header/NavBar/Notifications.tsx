import { Box, IconButton, useColorMode } from '@chakra-ui/react'
import { ethAssetId, ethChainId } from '@shapeshiftoss/caip'
import type { BIP32Path, ETHSignTypedData, ETHWallet } from '@shapeshiftoss/hdwallet-core'
import type { CustomTheme, ThemeMode as ThemeModeType } from '@wherever/react-notification-feed'
import { getConfig } from 'config'
import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { toHex } from 'viem'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { selectAccountIdsByAssetId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints, theme } from 'theme/theme'

const NotificationBell = lazy(() =>
  import('@wherever/react-notification-feed').then(({ NotificationBell }) => ({
    default: NotificationBell,
  })),
)

const NotificationFeed = lazy(() =>
  import('@wherever/react-notification-feed').then(({ NotificationFeed }) => ({
    default: NotificationFeed,
  })),
)

const NotificationFeedProvider = lazy(() =>
  import('@wherever/react-notification-feed').then(({ NotificationFeedProvider }) => ({
    default: NotificationFeedProvider,
  })),
)

const suspenseFallback = <div />

const eip712SupportedWallets = [KeyManager.KeepKey, KeyManager.Native, KeyManager.Mobile]

export const Notifications = memo(() => {
  const translate = useTranslate()
  const isWhereverEnabled = useFeatureFlag('Wherever')
  const { colorMode } = useColorMode()
  const {
    state: { wallet, modalType },
  } = useWallet()
  const isSnapInstalled = useIsSnapInstalled()

  const ethAccountIds = useAppSelector(state =>
    selectAccountIdsByAssetId(state, { assetId: ethAssetId }),
  )

  const [addressNList, setAddressNList] = useState<BIP32Path>()
  const [ethAddress, setEthAddress] = useState<string | null>()

  const disableAnalytics = window.location.href.includes('private.shapeshift.com')
  const partnerKey = getConfig().REACT_APP_WHEREVER_PARTNER_KEY
  const mobileBreakpoint = Number(breakpoints.md.replace('px', ''))

  const themeObj: CustomTheme = useMemo(() => {
    const baseTheme =
      colorMode === 'light'
        ? {
            mode: 'light' as ThemeModeType,
            primaryColor: theme.colors.primary,
            backgroundColor: theme.colors.gray[100],
            textColor: theme.colors.gray[800],
            bellColor: theme.colors.gray[700],
          }
        : {
            textColor: theme.colors.gray[50],
          }
    return {
      ...baseTheme,
      borderRadius: 'md',
      mobileBreakpoint,
    }
  }, [colorMode, mobileBreakpoint])

  const walletSupportsEth = useMemo(
    () =>
      walletSupportsChain({
        chainId: ethChainId,
        wallet,
        isSnapInstalled,
        checkConnectedAccountIds: ethAccountIds,
      }),
    [ethAccountIds, isSnapInstalled, wallet],
  )

  useEffect(() => {
    if (!(wallet && walletSupportsEth && eip712SupportedWallets.includes(modalType as KeyManager)))
      return
    ;(async () => {
      const { addressNList } = (wallet as ETHWallet).ethGetAccountPaths({
        coin: 'Ethereum',
        accountIdx: 0,
      })[0]

      const ethAddress = await (wallet as ETHWallet).ethGetAddress({
        addressNList,
        showDisplay: false,
      })

      setEthAddress(ethAddress)
      setAddressNList(addressNList)
    })()
  }, [modalType, wallet, walletSupportsEth])

  const signMessage = useCallback(
    async (message: string) => {
      if (
        !addressNList ||
        !wallet ||
        !walletSupportsEth ||
        !eip712SupportedWallets.includes(modalType as KeyManager)
      ) {
        return
      }

      try {
        // TODO(gomes): why aren't we using chain-adapters' signMessage here?
        const signedMsg = await (wallet as ETHWallet).ethSignMessage({
          addressNList,
          message: toHex(message),
        })

        return signedMsg?.signature
      } catch (e) {
        console.error(e)
      }
    },
    [addressNList, modalType, wallet, walletSupportsEth],
  )

  const signTypedData = useCallback(
    async (typedData: ETHSignTypedData['typedData']) => {
      if (
        !addressNList ||
        !wallet ||
        !walletSupportsEth ||
        !eip712SupportedWallets.includes(modalType as KeyManager)
      ) {
        return
      }

      try {
        const signedMsg = await (wallet as ETHWallet).ethSignTypedData?.({
          addressNList,
          typedData,
        })

        return signedMsg?.signature
      } catch (e) {
        console.error(e)
      }
    },
    [addressNList, modalType, wallet, walletSupportsEth],
  )

  const customSignerProp = useMemo(
    () => ({
      address: ethAddress,
      chainId: 1,
      signMessage,
      signTypedData,
    }),
    [ethAddress, signMessage, signTypedData],
  )

  if (
    !isWhereverEnabled ||
    !ethAddress ||
    !wallet ||
    !eip712SupportedWallets.includes(modalType as KeyManager) ||
    !walletSupportsEth
  )
    return null

  return (
    <Box>
      <Suspense fallback={suspenseFallback}>
        <NotificationFeedProvider
          customSigner={customSignerProp}
          partnerKey={partnerKey}
          theme={themeObj}
          disableAnalytics={disableAnalytics}
        >
          <NotificationFeed gapFromBell={10} placement='bottom-end'>
            <IconButton aria-label={translate('navBar.openNotif')}>
              <NotificationBell size={20} />
            </IconButton>
          </NotificationFeed>
        </NotificationFeedProvider>
      </Suspense>
    </Box>
  )
})
