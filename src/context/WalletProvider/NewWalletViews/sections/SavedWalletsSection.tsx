import { Box, Button, Flex, Icon, Stack, Text as CText, useColorModeValue } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { FaPlus, FaWallet } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'

import { FoxIcon } from '@/components/Icons/FoxIcon'
import { Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { NativeConfig } from '@/context/WalletProvider/NativeWallet/config'
import { NativeWalletRoutes } from '@/context/WalletProvider/types'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { reactQueries } from '@/react-queries'

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
      variant='ghost'
      whiteSpace='normal'
      px={4}
      ml='-16px'
      mr='-16px'
      py={2.5}
      borderRadius='md'
      onClick={handleClick}
      bg={isSelected ? bgColor : undefined}
    >
      <Flex alignItems='center' width='full'>
        <FoxIcon boxSize='24px' mr={3}>
          <FaWallet />
        </FoxIcon>
        <Box textAlign='left'>
          <CText isTruncated maxW='200px'>
            {wallet.name}
          </CText>
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
  const navigate = useNavigate()
  const localWallet = useLocalWallet()
  const { getAdapter, dispatch } = useWallet()

  const nativeVaultsQuery = useQuery({
    ...reactQueries.common.hdwalletNativeVaultsList(),
    refetchOnMount: true,
  })

  const handleWalletSelect = useCallback(
    async (wallet: VaultInfo) => {
      const deviceId = wallet.id

      // Ensure we're at the correct route when selecting a saved wallet
      dispatch({ type: WalletActions.SET_INITIAL_ROUTE, payload: '/native/enter-password' })

      // Ensure the wallet is visually selected in the left wallets list
      onWalletSelect(deviceId, '/native/enter-password')

      const adapter = await getAdapter(KeyManager.Native)
      if (!adapter) return

      dispatch({
        type: WalletActions.SET_NATIVE_PENDING_DEVICE_ID,
        payload: deviceId,
      })

      try {
        const { name, icon } = NativeConfig
        const walletInstance = await adapter.pairDevice(deviceId)

        if (!walletInstance) throw new Error(`Failed to pair device: ${deviceId}`)

        localWallet.setLocalWallet({ type: KeyManager.Native, deviceId })
        localWallet.setLocalNativeWalletName(wallet.name)

        dispatch({
          type: WalletActions.SET_CONNECTOR_TYPE,
          payload: { modalType: KeyManager.Native, isMipdProvider: false },
        })

        const initialized = await walletInstance.initialize()

        if (!initialized) return

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

        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        dispatch({ type: WalletActions.RESET_NATIVE_PENDING_DEVICE_ID })
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      } catch (e) {
        console.error(e)
      }
    },
    [dispatch, getAdapter, localWallet, onWalletSelect],
  )

  const handleAddNewWalletClick = useCallback(() => {
    navigate(NativeWalletRoutes.Connect)
  }, [navigate])

  return (
    <>
      <Text
        fontSize='lg'
        fontWeight='semibold'
        translation='walletProvider.shapeShift.onboarding.shapeshiftNative'
      />
      <Stack spacing={2} my={6}>
        {(nativeVaultsQuery.data ?? []).map(wallet => (
          <WalletCard
            key={wallet.id}
            wallet={wallet}
            onClick={handleWalletSelect}
            isSelected={selectedWalletId === wallet.id}
          />
        ))}
        <Box
          as={Button}
          variant='ghost'
          whiteSpace='normal'
          px={4}
          ml='-16px'
          mr='-16px'
          py={2.5}
          borderRadius='md'
          onClick={handleAddNewWalletClick}
        >
          <Flex alignItems='center' width='full' color='gray.500'>
            <Icon as={FaPlus} boxSize='12px' mr={3} />
            <Box textAlign='left'>
              <Text translation='walletProvider.shapeShift.onboarding.addNewWallet' />
            </Box>
          </Flex>
        </Box>
      </Stack>
    </>
  )
}
