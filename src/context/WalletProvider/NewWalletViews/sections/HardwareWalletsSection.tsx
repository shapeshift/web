import type { ComponentWithAs, IconProps } from '@chakra-ui/react'
import { Box, Button, Flex, Stack, Text as CText, useColorModeValue } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'

import { Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { GridPlusConfig } from '@/context/WalletProvider/GridPlus/config'
import { KeepKeyConfig } from '@/context/WalletProvider/KeepKey/config'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { LedgerConfig } from '@/context/WalletProvider/Ledger/config'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { SEEKER_DEFAULT_CLUSTER, SeekerConfig } from '@/context/WalletProvider/Seeker/config'
import {
  checkSeekerAvailability,
  seekerAuthorize,
  seekerDeauthorize,
  seekerGetAddress,
  seekerGetPublicKey,
  seekerGetStatus,
  seekerSignAndSendTransaction,
  seekerSignMessage,
  seekerSignTransaction,
} from '@/context/WalletProvider/Seeker/seekerMessageHandlers'
import { TrezorConfig } from '@/context/WalletProvider/Trezor/config'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'

const LedgerIcon = LedgerConfig.icon
const TrezorIcon = TrezorConfig.icon
const KeepKeyIcon = KeepKeyConfig.icon
const GridPlusIcon = GridPlusConfig.icon
const SeekerIcon = SeekerConfig.icon

type WalletOptionProps = {
  connect: () => void
  isSelected: boolean
  isDisabled: boolean
  icon: ComponentWithAs<'svg', IconProps>
  name: string
}

const WalletOption = ({ connect, isSelected, isDisabled, icon: Icon, name }: WalletOptionProps) => {
  const backgroundColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')

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
      onClick={connect}
      bg={isSelected ? backgroundColor : undefined}
      isDisabled={isDisabled}
    >
      <Flex alignItems='center' width='full'>
        <Box boxSize='24px' mr={3}>
          <Icon />
        </Box>
        <CText fontSize='md' fontWeight='medium'>
          {name}
        </CText>
      </Flex>
    </Box>
  )
}

export const HardwareWalletsSection = ({
  isLoading,
  selectedWalletId,
  onWalletSelect,
}: {
  isLoading: boolean
  selectedWalletId: string | null
  onWalletSelect: (id: string, initialRoute: string) => void
}) => {
  const { connect, dispatch } = useWallet()
  const localWallet = useLocalWallet()
  const [isSeekerAvailable, setIsSeekerAvailable] = useState(false)

  useEffect(() => {
    const checkSeeker = async () => {
      try {
        const result = await checkSeekerAvailability()
        setIsSeekerAvailable(result.available)
      } catch (error) {
        setIsSeekerAvailable(false)
      }
    }
    checkSeeker()
  }, [])

  const handleConnectLedger = useCallback(() => {
    onWalletSelect(KeyManager.Ledger, '/ledger/connect')
    connect(KeyManager.Ledger, false)
  }, [connect, onWalletSelect])

  const handleConnectTrezor = useCallback(() => {
    onWalletSelect(KeyManager.Trezor, '/trezor/connect')
    connect(KeyManager.Trezor, false)
  }, [connect, onWalletSelect])

  const handleConnectKeepKey = useCallback(() => {
    onWalletSelect(KeyManager.KeepKey, '/keepkey/connect')
    connect(KeyManager.KeepKey, false)
  }, [connect, onWalletSelect])

  const handleConnectGridPlus = useCallback(() => {
    onWalletSelect(KeyManager.GridPlus, '/gridplus/connect')
    connect(KeyManager.GridPlus, false)
  }, [connect, onWalletSelect])

  const handleConnectSeeker = useCallback(async () => {
    try {
      const authResult = await seekerAuthorize(SEEKER_DEFAULT_CLUSTER)

      if (!authResult.success || !authResult.address) {
        console.error('Seeker authorization failed')
        return
      }

      const { SeekerHDWallet } = await import('@shapeshiftoss/hdwallet-seeker')

      const messageHandler = {
        checkAvailability: checkSeekerAvailability,
        authorize: seekerAuthorize,
        deauthorize: seekerDeauthorize,
        getAddress: seekerGetAddress,
        getStatus: seekerGetStatus,
        signTransaction: seekerSignTransaction,
        signAndSendTransaction: seekerSignAndSendTransaction,
        getPublicKey: seekerGetPublicKey,
        signMessage: seekerSignMessage,
      }

      const deviceId = `seeker:${authResult.address}`
      const wallet = new SeekerHDWallet(deviceId, authResult.address, messageHandler)

      const { icon } = SeekerConfig
      const name = authResult.label || SeekerConfig.name
      await wallet.initialize()

      dispatch({
        type: WalletActions.SET_WALLET,
        payload: { wallet, name, icon, deviceId, connectedType: KeyManager.Seeker },
      })
      dispatch({
        type: WalletActions.SET_IS_CONNECTED,
        payload: true,
      })
      dispatch({ type: WalletActions.SET_IS_LOCKED, payload: false })
      localWallet.setLocalWallet({ type: KeyManager.Seeker, deviceId })
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    } catch (error) {
      console.error('Error connecting to Seeker:', error)
    }
  }, [dispatch, localWallet])

  const isGridPlusWalletEnabled = useFeatureFlag('GridPlusWallet')
  const isTrezorWalletEnabled = useFeatureFlag('TrezorWallet')

  return (
    <Stack spacing={2} my={6}>
      <Text
        fontSize='sm'
        fontWeight='medium'
        color='gray.500'
        translation='common.hardwareWallets'
      />
      <WalletOption
        connect={handleConnectLedger}
        isSelected={selectedWalletId === KeyManager.Ledger}
        isDisabled={isLoading && selectedWalletId !== KeyManager.Ledger}
        icon={LedgerIcon}
        name={LedgerConfig.name}
      />
      {isTrezorWalletEnabled && (
        <WalletOption
          connect={handleConnectTrezor}
          isSelected={selectedWalletId === KeyManager.Trezor}
          isDisabled={isLoading && selectedWalletId !== KeyManager.Trezor}
          icon={TrezorIcon}
          name={TrezorConfig.name}
        />
      )}
      <WalletOption
        connect={handleConnectKeepKey}
        isSelected={selectedWalletId === KeyManager.KeepKey}
        isDisabled={isLoading && selectedWalletId !== KeyManager.KeepKey}
        icon={KeepKeyIcon}
        name={KeepKeyConfig.name}
      />
      {isGridPlusWalletEnabled && (
        <WalletOption
          connect={handleConnectGridPlus}
          isSelected={selectedWalletId === KeyManager.GridPlus}
          isDisabled={isLoading && selectedWalletId !== KeyManager.GridPlus}
          icon={GridPlusIcon}
          name={GridPlusConfig.name}
        />
      )}
      {isSeekerAvailable && (
        <WalletOption
          connect={handleConnectSeeker}
          isSelected={selectedWalletId === KeyManager.Seeker}
          isDisabled={isLoading && selectedWalletId !== KeyManager.Seeker}
          icon={SeekerIcon}
          name={SeekerConfig.name}
        />
      )}
    </Stack>
  )
}
