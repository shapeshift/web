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

import { GridPlusConfig } from '../config'

import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'
import {
  selectWalletDeviceId,
  selectGridPlusPrivKey,
} from '@/state/slices/localWalletSlice/selectors'
import { useAppSelector } from '@/state/store'

export const GridPlusConnect = () => {
  const navigate = useNavigate()
  const { getAdapter, dispatch } = useWallet()
  const localWallet = useLocalWallet()

  // Check for existing GridPlus connection using selectors
  const existingDeviceId = useAppSelector(selectWalletDeviceId)
  const existingPrivKey = useAppSelector(selectGridPlusPrivKey)
  // Only check privKey - walletType/deviceId get cleared on disconnect but privKey persists
  const hasExistingConnection = !!existingPrivKey

  console.log('[GridPlus Connect] State check:', {
    existingDeviceId,
    existingPrivKey: existingPrivKey ? `${existingPrivKey.substring(0, 10)}...` : null,
    hasExistingConnection
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deviceId, setDeviceId] = useState('')
  const [showPairingCode, setShowPairingCode] = useState(false)
  const [pairingCode, setPairingCode] = useState('')

  // Pre-fill deviceId if reconnecting
  useEffect(() => {
    console.log('[GridPlus Connect] useEffect check:', {
      hasExistingConnection,
      existingDeviceId,
      willPrefillDeviceId: hasExistingConnection && existingDeviceId
    })
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
    console.log('[GridPlus] ========== handleConnect START ==========')
    console.log('[GridPlus] Initial state:', {
      deviceId: deviceId.trim(),
      showPairingCode,
      pairingCode,
      hasExistingPrivKey: !!existingPrivKey,
      existingPrivKeyPreview: existingPrivKey ? `${existingPrivKey.substring(0, 10)}...` : null
    })

    setIsLoading(true)
    setError(null)

    try {
      if (!deviceId.trim()) {
        throw new Error('Device ID is required')
      }

      // Get the GridPlus adapter with keyring
      console.log('[GridPlus] Getting adapter...')
      const adapterWithKeyring = await getAdapter(KeyManager.GridPlus) as any
      if (!adapterWithKeyring) {
        throw new Error('GridPlus adapter not available')
      }
      console.log('[GridPlus] Adapter loaded successfully')

      // Check device pairing status
      if (!showPairingCode) {
        console.log('[GridPlus] Step 1: Connecting to device...', {
          hasExistingPrivKey: !!existingPrivKey,
          deviceId: deviceId.trim()
        })
        const { isPaired, privKey } = await adapterWithKeyring.connectDevice(
          deviceId.trim(),
          undefined,
          existingPrivKey || undefined
        )
        console.log('[GridPlus] connectDevice result:', {
          isPaired,
          privKeyReceived: !!privKey,
          privKeyPreview: privKey ? `${privKey.substring(0, 10)}...` : null
        })

        if (!isPaired) {
          console.log('[GridPlus] Device connected but NOT paired - showing pairing UI')
          setIsLoading(false)
          setShowPairingCode(true)
          setError(null)
          return // Exit here and wait for pairing code
        }

        // If already paired, continue to create wallet...
        console.log('[GridPlus] Device ALREADY paired - proceeding to create wallet')
        console.log('[GridPlus] Saving privKey to Redux...', {
          privKeyToSave: privKey ? `${privKey.substring(0, 10)}...` : null
        })
        localWallet.setGridPlusPrivKey(privKey)
        console.log('[GridPlus] privKey saved to Redux')
      }

      // Step 2: Either device was already paired, or user entered pairing code
      console.log('[GridPlus] Step 2: Creating wallet...', {
        showPairingCode,
        hasPairingCode: !!pairingCode
      })
      let wallet
      if (showPairingCode && pairingCode) {
        console.log('[GridPlus] Using pairConnectedDevice with pairing code');
        wallet = await adapterWithKeyring.pairConnectedDevice(deviceId.trim(), pairingCode)
        console.log('[GridPlus] pairConnectedDevice completed')
      } else {
        console.log('[GridPlus] Using pairDevice (already paired flow)');
        wallet = await adapterWithKeyring.pairDevice(
          deviceId.trim(),
          undefined,
          undefined,
          existingPrivKey || undefined
        )
        console.log('[GridPlus] pairDevice completed')
      }

      // Save privKey after successful pairing
      console.log('[GridPlus] Getting privKey from wallet...')
      const walletPrivKey = wallet.getPrivKey()
      console.log('[GridPlus] wallet.getPrivKey() result:', {
        hasPrivKey: !!walletPrivKey,
        privKeyPreview: walletPrivKey ? `${walletPrivKey.substring(0, 10)}...` : null
      })
      if (walletPrivKey) {
        console.log('[GridPlus] Saving privKey to Redux...', {
          privKeyToSave: `${walletPrivKey.substring(0, 10)}...`
        })
        localWallet.setGridPlusPrivKey(walletPrivKey)
        console.log('[GridPlus] privKey saved to Redux')
      } else {
        console.warn('[GridPlus] WARNING: wallet.getPrivKey() returned null/undefined!')
      }

      // Set wallet in ShapeShift context
      console.log('[GridPlus] Setting wallet in ShapeShift context...')
      const walletDeviceId = await wallet.getDeviceID()
      console.log('[GridPlus] Wallet deviceId:', walletDeviceId)

      dispatch({
        type: WalletActions.SET_WALLET,
        payload: {
          wallet,
          name: GridPlusConfig.name,
          icon: GridPlusConfig.icon,
          deviceId: walletDeviceId,
          connectedType: KeyManager.GridPlus
        },
      })
      console.log('[GridPlus] Wallet set in context')

      dispatch({
        type: WalletActions.SET_IS_CONNECTED,
        payload: true,
      })
      console.log('[GridPlus] Connection status set')

      // Save to local wallet storage
      console.log('[GridPlus] Saving to localWallet slice...', {
        type: KeyManager.GridPlus,
        deviceId: walletDeviceId
      })
      localWallet.setLocalWallet({ type: KeyManager.GridPlus, deviceId: walletDeviceId, rdns: null })
      console.log('[GridPlus] Saved to localWallet slice')

      // Close the modal
      console.log('[GridPlus] Closing modal and navigating...')
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })

      // Navigate to main app
      navigate('/')
      console.log('[GridPlus] ========== handleConnect SUCCESS ==========')
    } catch (e) {
      console.error('[GridPlus] ========== handleConnect ERROR ==========', e)
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

  console.log('[GridPlus Connect] Render:', {
    showPairingCode,
    hasExistingConnection,
    header: showPairingCode ? 'Pair GridPlus Lattice' : hasExistingConnection ? 'Reconnect to GridPlus' : 'Connect GridPlus Lattice'
  })

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
                autoComplete="off"
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
                autoComplete="off"
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