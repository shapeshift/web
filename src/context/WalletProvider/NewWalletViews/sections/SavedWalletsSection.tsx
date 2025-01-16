import { Box, Button, Flex, Stack, Text as CText, useColorModeValue } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { FaWallet } from 'react-icons/fa'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useLocalWallet } from 'context/WalletProvider/local-wallet'
import { NativeConfig } from 'context/WalletProvider/NativeWallet/config'
import { useWallet } from 'hooks/useWallet/useWallet'

type VaultInfo = {
  id: string
  name: string
}

type WalletCardProps = {
  wallet: VaultInfo
  onClick: (wallet: VaultInfo) => void
  isSelected: boolean
}

const WalletCard = ({ wallet, onClick, isSelected }: WalletCardProps) => {
  const handleClick = useCallback(() => onClick(wallet), [onClick, wallet])
  const bgColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')

  return (
    <Box
      as={Button}
      key={wallet.id}
      variant='ghost'
      px={4}
      ml={-4}
      py={6}
      borderRadius='md'
      width='full'
      onClick={handleClick}
      bg={isSelected ? bgColor : undefined}
    >
      <Flex alignItems='center' width='full'>
        <FoxIcon boxSize='24px' mr={3}>
          <FaWallet />
        </FoxIcon>
        <Box textAlign='left'>
          <CText>{wallet.name}</CText>
        </Box>
      </Flex>
    </Box>
  )
}

export const SavedWalletsSection = ({
  selectedWalletId,
  onWalletSelect,
}: {
  selectedWalletId: string | null
  onWalletSelect: (id: string, initialRoute: string) => void
}) => {
  const [wallets, setWallets] = useState<VaultInfo[]>([])
  const localWallet = useLocalWallet()
  const { getAdapter, dispatch } = useWallet()

  // TODO(gomes): let's use this PR as an opportunity to remove this digusting IIAFE from copypasta, yes it works but pls
  useEffect(() => {
    ;(async () => {
      const Vault = await import('@shapeshiftoss/hdwallet-native-vault').then(m => m.Vault)
      try {
        const vaultIds = await Vault.list()
        const storedWallets: VaultInfo[] = await Promise.all(
          vaultIds.map(async id => {
            const meta = await Vault.meta(id)
            const name = String(meta?.get('name') ?? id)
            return { id, name }
          }),
        )
        setWallets(storedWallets)
      } catch (e) {
        console.error(e)
        setWallets([])
      }
    })()
  }, [])

  const handleWalletSelect = useCallback(
    async (wallet: VaultInfo) => {
      // Ensure we're at the correct route when selecting a saved wallet
      dispatch({ type: WalletActions.SET_INITIAL_ROUTE, payload: '/native/enter-password' })
      // Ensure the wallet is visually selected in the left wallets list
      onWalletSelect(wallet.id, '/native/enter-password')

      const adapter = await getAdapter(KeyManager.Native)
      const deviceId = wallet.id
      if (adapter) {
        const { name, icon } = NativeConfig
        try {
          dispatch({
            type: WalletActions.SET_NATIVE_PENDING_DEVICE_ID,
            payload: deviceId,
          })

          const walletInstance = await adapter.pairDevice(deviceId)
          if (!(await walletInstance?.isInitialized())) {
            await walletInstance?.initialize()
          } else {
            dispatch({
              type: WalletActions.SET_WALLET,
              payload: {
                wallet: walletInstance,
                name,
                icon,
                deviceId,
                meta: { label: wallet.name },
                connectedType: KeyManager.Native,
              },
            })
            dispatch({
              type: WalletActions.SET_IS_CONNECTED,
              payload: true,
            })
            dispatch({ type: WalletActions.RESET_NATIVE_PENDING_DEVICE_ID })
            dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
          }

          localWallet.setLocalWallet({ type: KeyManager.Native, deviceId })
          localWallet.setLocalNativeWalletName(wallet.name)
        } catch (e) {
          console.error(e)
        }
      }
    },
    [dispatch, getAdapter, localWallet, onWalletSelect],
  )

  if (!wallets.length) return null

  return (
    <Stack spacing={2} my={6}>
      <Text
        fontSize='sm'
        fontWeight='medium'
        color='gray.500'
        translation={'walletProvider.shapeShift.load.header'}
      />
      {wallets.map(wallet => (
        <WalletCard
          wallet={wallet}
          onClick={handleWalletSelect}
          isSelected={selectedWalletId === wallet.id}
        />
      ))}
    </Stack>
  )
}
