import {
  Alert,
  AlertIcon,
  VStack,
  Text,
  Box,
  FormControl,
  FormLabel,
  Input,
} from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ConnectModal } from '../../components/ConnectModal'
import { GridPlusConfig } from '../config'

import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const GridPlusConnect = () => {
  const navigate = useNavigate()
  const { getAdapter, dispatch } = useWallet()
  const localWallet = useLocalWallet()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deviceId, setDeviceId] = useState('')
  const [showPairingCode, setShowPairingCode] = useState(false)
  const [pairingCode, setPairingCode] = useState('')

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
        console.log('[GridPlus] Attempting connection to device')
        const { isPaired } = await adapterWithKeyring.connectDevice(deviceId.trim())
        
        if (!isPaired) {
          console.log('[GridPlus] Device connected but not paired - showing pairing UI')
          setIsLoading(false)
          setShowPairingCode(true)
          setError(null)
          return // Exit here and wait for pairing code
        }
        
        // If already paired, continue to create wallet...
        console.log('[GridPlus] Device already paired - creating wallet')
      }

      // Step 2: Either device was already paired, or user entered pairing code
      let wallet
      if (showPairingCode && pairingCode) {
        console.log('[GridPlus Debug] Step 2: Pairing connected device with code:', pairingCode);
        wallet = await adapterWithKeyring.pairConnectedDevice(deviceId.trim(), pairingCode)
      } else {
        // Device was already paired, use legacy method
        wallet = await adapterWithKeyring.pairDevice(deviceId.trim())
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
      localWallet.setLocalWallet({ type: KeyManager.GridPlus, deviceId: await wallet.getDeviceID() })

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

  return (
    <ConnectModal
      headerText={'Connect GridPlus Lattice'}
      bodyText={showPairingCode ? 'Enter the 6-digit pairing code displayed on your Lattice device.' : 'Enter your device ID to connect to your GridPlus Lattice.'}
      buttonText={showPairingCode ? 'Complete Pairing' : 'Connect Device'}
      onPairDeviceClick={handleConnect}
      loading={isLoading}
      error={error}
    >
      <VStack spacing={4} align="stretch">
        {!showPairingCode ? (
          <FormControl>
            <FormLabel>Device ID</FormLabel>
            <Input
              placeholder="Enter your Lattice device ID"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              isDisabled={isLoading}
              type="password"
              autoComplete="current-password"
            />
          </FormControl>
        ) : (
          <FormControl>
            <FormLabel>Pairing Code</FormLabel>
            <Input
              placeholder="Enter 8-character code from Lattice"
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
              isDisabled={isLoading}
              maxLength={8}
              pattern="[A-Z0-9]{8}"
              style={{ textTransform: 'uppercase' }}
            />
          </FormControl>
        )}
        

        <Box>
          <Text fontSize="sm" color="text.subtle">
            {showPairingCode 
              ? 'Look at your Lattice screen for an 8-character pairing code.'
              : 'You can find your device ID in your Lattice settings under Device Info.'
            }
          </Text>
        </Box>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
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
    </ConnectModal>
  )
}