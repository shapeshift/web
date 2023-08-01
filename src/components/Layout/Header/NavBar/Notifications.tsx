import { Box, IconButton, useColorMode } from '@chakra-ui/react'
import type { BIP32Path, ETHSignTypedData } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { CustomTheme } from '@wherever/react-notification-feed'
import {
  NotificationBell,
  NotificationFeed,
  NotificationFeedProvider,
  ThemeMode,
} from '@wherever/react-notification-feed'
import { getConfig } from 'config'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from 'hooks/useWallet/useWallet'
import { breakpoints, theme } from 'theme/theme'

const eip712SupportedWallets = [KeyManager.KeepKey, KeyManager.Native, KeyManager.Mobile]

export const Notifications = () => {
  const isWhereverEnabled = useFeatureFlag('Wherever')
  const { colorMode } = useColorMode()
  const {
    state: { wallet, modalType },
  } = useWallet()

  const [addressNList, setAddressNList] = useState<BIP32Path>()
  const [ethAddress, setEthAddress] = useState<string | null>()

  const disableAnalytics = window.location.href.includes('private.shapeshift.com')
  const partnerKey = getConfig().REACT_APP_WHEREVER_PARTNER_KEY
  const mobileBreakpoint = Number(breakpoints.md.replace('px', ''))

  const themeObj: CustomTheme = useMemo(() => {
    const baseTheme =
      colorMode === 'light'
        ? {
            mode: ThemeMode.Light,
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

  useEffect(() => {
    if (!wallet || !supportsETH(wallet)) return
    ;(async () => {
      const { addressNList } = wallet.ethGetAccountPaths({
        coin: 'Ethereum',
        accountIdx: 0,
      })[0]

      const ethAddress = await wallet.ethGetAddress({ addressNList, showDisplay: false })

      setEthAddress(ethAddress)
      setAddressNList(addressNList)
    })()
  }, [wallet])

  const signMessage = useCallback(
    async (message: string) => {
      if (!addressNList || !wallet || !supportsETH(wallet)) {
        return
      }

      try {
        const signedMsg = await wallet.ethSignMessage({
          addressNList,
          message,
        })

        return signedMsg?.signature
      } catch (e) {
        console.error(e)
      }
    },
    [wallet, addressNList],
  )

  const signTypedData = useCallback(
    async (typedData: ETHSignTypedData['typedData']) => {
      if (!addressNList || !wallet || !supportsETH(wallet)) {
        return
      }

      try {
        const signedMsg = await wallet.ethSignTypedData?.({
          addressNList,
          typedData,
        })

        return signedMsg?.signature
      } catch (e) {
        console.error(e)
      }
    },
    [wallet, addressNList],
  )

  if (
    !isWhereverEnabled ||
    !ethAddress ||
    !wallet ||
    !eip712SupportedWallets.includes(modalType as KeyManager) ||
    !supportsETH(wallet)
  )
    return null

  return (
    <Box>
      <NotificationFeedProvider
        customSigner={{
          address: ethAddress,
          chainId: 1,
          signMessage,
          signTypedData,
        }}
        partnerKey={partnerKey}
        theme={themeObj}
        disableAnalytics={disableAnalytics}
      >
        <NotificationFeed gapFromBell={10} placement={'bottom-end'}>
          <IconButton aria-label='Open notifications'>
            <NotificationBell size={20} />
          </IconButton>
        </NotificationFeed>
      </NotificationFeedProvider>
    </Box>
  )
}
