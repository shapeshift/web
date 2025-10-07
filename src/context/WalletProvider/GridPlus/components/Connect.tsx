import {
  Alert,
  AlertIcon,
  VStack,
  Text,
  Box,
  FormControl,
  FormLabel,
  Input,
  Button,
  ModalHeader,
  ModalBody,
  Spinner,
} from '@chakra-ui/react'
import { useCallback, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/state/store'

import { GridPlusConfig } from '../config'

import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const GridPlusConnect = () => {
  const navigate = useNavigate()
  const { getAdapter, dispatch } = useWallet()
  const localWallet = useLocalWallet()

  // Check for existing GridPlus connection
  const existingDeviceId = useAppSelector(state => state.localWallet.walletDeviceId)
  const existingPrivKey = useAppSelector(state => state.localWallet.gridplusPrivKey)
  const existingWalletType = useAppSelector(state => state.localWallet.walletType)
  const hasExistingConnection = existingWalletType === KeyManager.GridPlus && existingDeviceId && existingPrivKey

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deviceId, setDeviceId] = useState('')
  const [showPairingCode, setShowPairingCode] = useState(false)
  const [pairingCode, setPairingCode] = useState('')

  // Pre-fill deviceId if reconnecting
  useEffect(() => {
    if (hasExistingConnection && existingDeviceId) {
      setDeviceId(existingDeviceId)
    }
  }, [hasExistingConnection, existingDeviceId])

  const setErrorLoading = useCallback((e: string | null) => {
    setError(e)
    setIsLoading(false)
  }, [])


  const resetPairingFlow = useCallback(() => {
    setShowPairingCode(false)
    setPairingCode('')
    setError(null)
    setIsLoading(false)
  }, [])


  const handleConnect = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      if (!deviceId.trim()) {
        throw new Error('Device ID is required')
      }

      // Get the GridPlus adapter with keyring
      const adapterWithKeyring = await getAdapter(KeyManager.GridPlus)
      if (!adapterWithKeyring) {
        throw new Error('GridPlus adapter not available')
      }

      // Check device pairing status
      if (!showPairingCode) {
        console.log('[GridPlus] Attempting connection to device', {
          hasExistingPrivKey: !!existingPrivKey,
          deviceId: deviceId.trim()
        })
        const { isPaired, privKey } = await adapterWithKeyring.connectDevice(
          deviceId.trim(),
          undefined,
          existingPrivKey || undefined
        )

        if (!isPaired) {
          console.log('[GridPlus] Device connected but not paired - showing pairing UI')
          setIsLoading(false)
          setShowPairingCode(true)
          setError(null)
          return // Exit here and wait for pairing code
        }

        // If already paired, continue to create wallet...
        console.log('[GridPlus] Device already paired - creating wallet')
        // Save privKey for future reconnections
        localWallet.setGridPlusPrivKey(privKey)
      }

      // Step 2: Either device was already paired, or user entered pairing code
      let wallet
      if (showPairingCode && pairingCode) {
        console.log('[GridPlus Debug] Step 2: Pairing connected device with code:', pairingCode);
        wallet = await adapterWithKeyring.pairConnectedDevice(deviceId.trim(), pairingCode)
      } else {
        // Device was already paired, use pairDevice with existing privKey
        wallet = await adapterWithKeyring.pairDevice(
          deviceId.trim(),
          undefined,
          undefined,
          existingPrivKey || undefined
        )
      }

      // Save privKey after successful pairing
      const walletPrivKey = wallet.getPrivKey()
      if (walletPrivKey) {
        localWallet.setGridPlusPrivKey(walletPrivKey)
      }

      // Set wallet in ShapeShift context
      dispatch({
        type: WalletActions.SET_WALLET,
        payload: {
          wallet,
          name: GridPlusConfig.name,
          icon: GridPlusConfig.icon,
          deviceId: await wallet.getDeviceID(),
          connectedType: KeyManager.GridPlus
        },
      })

      dispatch({
        type: WalletActions.SET_IS_CONNECTED,
        payload: true,
      })

      // Save to local wallet storage
      localWallet.setLocalWallet({ type: KeyManager.GridPlus, deviceId: await wallet.getDeviceID(), rdns: null })

      // Close the modal
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })


      // Navigate to main app
      navigate('/')
    } catch (e) {
      console.error(e)
      if (e instanceof Error && e.message === 'PAIRING_REQUIRED') {
        setIsLoading(false)
        setShowPairingCode(true)
        setError(null)
      } else {
        setErrorLoading(e instanceof Error ? e.message : 'Connection failed')
      }
    }
  }, [deviceId, pairingCode, showPairingCode, setErrorLoading, getAdapter, dispatch, localWallet, navigate])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault()
      handleConnect()
    }
  }, [handleConnect, isLoading])

  return (
    <>
      <ModalHeader>
        {showPairingCode ? 'Pair GridPlus Lattice' : hasExistingConnection ? 'Reconnect to GridPlus' : 'Connect GridPlus Lattice'}
      </ModalHeader>
      <ModalBody>
        <Text mb={4} color='text.subtle'>
          {showPairingCode
            ? 'Enter the 8-character pairing code displayed on your Lattice device.'
            : hasExistingConnection
            ? 'Click below to reconnect to your GridPlus Lattice.'
            : 'Enter your device ID to connect to your GridPlus Lattice.'
          }
        </Text>

        <VStack spacing={4} align="stretch">
          {!showPairingCode && !hasExistingConnection ? (
            <FormControl>
              <FormLabel>Device ID</FormLabel>
              <Input
                placeholder="Enter your Lattice device ID"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                onKeyDown={handleKeyDown}
                isDisabled={isLoading}
                type="password"
                autoComplete="current-password"
                autoFocus
              />
            </FormControl>
          ) : showPairingCode ? (
            <FormControl>
              <FormLabel>Pairing Code</FormLabel>
              <Input
                placeholder="Enter 8-character code from Lattice"
                value={pairingCode}
                onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                isDisabled={isLoading}
                maxLength={8}
                pattern="[A-Z0-9]{8}"
                style={{ textTransform: 'uppercase' }}
                autoFocus
              />
            </FormControl>
          ) : null}

          {!showPairingCode && !hasExistingConnection && (
            <Box>
              <Text fontSize="sm" color="text.subtle">
                You can find your device ID in your Lattice settings under Device Info.
              </Text>
            </Box>
          )}

          {showPairingCode && (
            <Box>
              <Text fontSize="sm" color="text.subtle">
                Look at your Lattice screen for an 8-character pairing code.
              </Text>
            </Box>
          )}

          {error && (
            <Alert status="error">
              <AlertIcon />
              {error}
            </Alert>
          )}

          {isLoading ? (
            <Button
              width='full'
              colorScheme='blue'
              isLoading
              loadingText='Connecting...'
              spinner={<Spinner color='white' />}
              isDisabled
            >
              {showPairingCode ? 'Complete Pairing' : hasExistingConnection ? 'Reconnecting...' : 'Connect Device'}
            </Button>
          ) : (
            <Button
              width='full'
              colorScheme='blue'
              onClick={handleConnect}
              isDisabled={(!showPairingCode && !hasExistingConnection && !deviceId.trim()) || (showPairingCode && !pairingCode.trim())}
            >
              {showPairingCode ? 'Complete Pairing' : hasExistingConnection ? 'Reconnect' : 'Connect Device'}
            </Button>
          )}

          {showPairingCode && (
            <Box>
              <Text
                fontSize="sm"
                color="blue.500"
                cursor="pointer"
                onClick={resetPairingFlow}
                textDecoration="underline"
              >
                ← Back to Device ID
              </Text>
            </Box>
          )}
        </VStack>
      </ModalBody>
    </>
  )
}