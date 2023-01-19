import { Box, IconButton, useColorMode } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { ETHSignTypedData } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { CustomTheme } from '@wherever/react-notification-feed'
import {
  NotificationBell,
  NotificationFeed,
  NotificationFeedProvider,
  ThemeMode,
} from '@wherever/react-notification-feed'
import { getConfig } from 'config'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { getLocalWalletType } from 'context/WalletProvider/local-wallet'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectWalletAccountIds } from 'state/slices/common-selectors'
import { breakpoints, theme } from 'theme/theme'

const eip712SupportedWallets = [KeyManager.KeepKey, KeyManager.Native]

export const Notifications = () => {
  const isWhereverEnabled = useFeatureFlag('Wherever')
  const { colorMode } = useColorMode()
  const {
    state: { wallet },
  } = useWallet()

  const walletAccountIds = useSelector(selectWalletAccountIds)

  const ethFullAccount = walletAccountIds.find(accountId => {
    const fullAccount = fromAccountId(accountId)
    return fullAccount.chainId === 'eip155:1'
  })

  const ethAddress = ethFullAccount ? fromAccountId(ethFullAccount).account : ''

  const disableAnalytics = window.location.href.includes('private.shapeshift.com')
  const partnerKey = getConfig().REACT_APP_WHEREVER_PARTNER_KEY
  const currentWallet = getLocalWalletType()
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

  if (
    !isWhereverEnabled ||
    !currentWallet ||
    !eip712SupportedWallets.includes(currentWallet) ||
    !wallet ||
    !supportsETH(wallet)
  )
    return null

  const { addressNList } = wallet.ethGetAccountPaths({
    coin: 'Ethereum',
    accountIdx: 0,
  })[0]

  const signMessage = async (message: string) => {
    const signedMsg = await wallet.ethSignMessage({
      addressNList,
      message,
    })

    return signedMsg?.signature
  }

  const signTypedData = async (typedData: ETHSignTypedData['typedData']) => {
    const signedMsg = await wallet.ethSignTypedData?.({
      addressNList,
      typedData,
    })

    return signedMsg?.signature
  }

  return (
    <Box>
      <NotificationFeedProvider
        customSigner={{
          address: ethAddress as string,
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
