import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  ModalBody,
  ModalHeader,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { GridPlusConfig } from '../config'

import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'
import {
  selectGridPlusPrivKey,
  selectWalletDeviceId,
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

  console.log('[GridPlus Connect] Initial State:', {
    existingDeviceId,
    existingPrivKey: existingPrivKey ? `${existingPrivKey.slice(0, 8)}...` : null,
    hasExistingConnection,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deviceId, setDeviceId] = useState('')
  const [showPairingCode, setShowPairingCode] = useState(false)
  const [pairingCode, setPairingCode] = useState('')

  // Use existingDeviceId if reconnecting, otherwise use input value
  const activeDeviceId = existingDeviceId || deviceId

  console.log('[GridPlus Connect] Active Device ID:', {
    activeDeviceId,
    source: existingDeviceId ? 'existing' : 'input',
  })

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

    console.log('[GridPlus Connect] handleConnect called with:', {
      activeDeviceId: activeDeviceId.trim(),
      showPairingCode,
      hasExistingConnection,
      existingPrivKey: existingPrivKey ? `${existingPrivKey.slice(0, 8)}...` : null,
    })

    try {
      if (!activeDeviceId.trim()) {
        throw new Error('Device ID is required')
      }

      // Get the GridPlus adapter with keyring
      const adapterWithKeyring = (await getAdapter(KeyManager.GridPlus)) as any
      if (!adapterWithKeyring) {
        throw new Error('GridPlus adapter not available')
      }

      // Check device pairing status
      // Always check on first connection attempt (when not showing pairing code screen)
      // SDK's storage will handle reconnection optimization automatically
      console.log('[GridPlus Connect] Pairing check decision:', {
        showPairingCode,
        hasExistingConnection,
        willCheckPairingStatus: !showPairingCode,
      })

      if (!showPairingCode) {
        const { isPaired, privKey } = await adapterWithKeyring.connectDevice(
          activeDeviceId.trim(),
          undefined,
          existingPrivKey || undefined,
        )

        if (!isPaired) {
          setIsLoading(false)
          setShowPairingCode(true)
          setError(null)
          return // Exit here and wait for pairing code
        }

        // If already paired, continue to create wallet...
        localWallet.setGridPlusPrivKey(privKey)
      }

      // Step 2: Either device was already paired, or user entered pairing code
      console.log('[GridPlus Connect] Pairing method selection:', {
        showPairingCode,
        hasPairingCode: !!pairingCode,
        willUsePairConnectedDevice: showPairingCode && !!pairingCode,
        willUsePairDevice: !showPairingCode || !pairingCode,
        existingPrivKey: existingPrivKey ? `${existingPrivKey.slice(0, 8)}...` : null,
      })

      let wallet
      if (showPairingCode && pairingCode) {
        console.log('[GridPlus Connect] Calling pairConnectedDevice')
        wallet = await adapterWithKeyring.pairConnectedDevice(activeDeviceId.trim(), pairingCode)
      } else {
        console.log('[GridPlus Connect] Calling pairDevice with:', {
          deviceId: activeDeviceId.trim(),
          hasExistingPrivKey: !!existingPrivKey,
        })
        wallet = await adapterWithKeyring.pairDevice(
          activeDeviceId.trim(),
          undefined,
          undefined,
          existingPrivKey || undefined,
        )
      }

      // Save privKey after successful pairing
      const walletPrivKey = wallet.getPrivKey()
      if (walletPrivKey) {
        localWallet.setGridPlusPrivKey(walletPrivKey)
      }

      // Set wallet in ShapeShift context
      const walletDeviceId = await wallet.getDeviceID()

      console.log('[GridPlus Connect] Wallet created successfully:', {
        walletPrivKey: walletPrivKey ? `${walletPrivKey.slice(0, 8)}...` : null,
        walletDeviceId,
      })

      dispatch({
        type: WalletActions.SET_WALLET,
        payload: {
          wallet,
          name: GridPlusConfig.name,
          icon: GridPlusConfig.icon,
          deviceId: walletDeviceId,
          connectedType: KeyManager.GridPlus,
        },
      })

      dispatch({
        type: WalletActions.SET_IS_CONNECTED,
        payload: true,
      })

      // Save to local wallet storage
      localWallet.setLocalWallet({
        type: KeyManager.GridPlus,
        deviceId: walletDeviceId,
        rdns: null,
      })

      // Close the modal
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })

      // Navigate to main app
      navigate('/')
    } catch (e) {
      if (e instanceof Error && e.message === 'PAIRING_REQUIRED') {
        setIsLoading(false)
        setShowPairingCode(true)
        setError(null)
      } else {
        setErrorLoading(e instanceof Error ? e.message : 'Connection failed')
      }
    }
  }, [
    activeDeviceId,
    pairingCode,
    showPairingCode,
    existingPrivKey,
    setErrorLoading,
    getAdapter,
    dispatch,
    localWallet,
    navigate,
  ])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isLoading) {
        e.preventDefault()
        handleConnect()
      }
    },
    [handleConnect, isLoading],
  )

  const handleDeviceIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDeviceId(e.target.value)
  }, [])

  const handlePairingCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPairingCode(e.target.value.toUpperCase())
  }, [])

  const inputStyle = useMemo(() => ({ textTransform: 'uppercase' as const }), [])

  const spinnerElement = useMemo(() => <Spinner color='white' />, [])

  return (
    <>
      <ModalHeader>
        {showPairingCode
          ? 'Pair GridPlus Lattice'
          : hasExistingConnection
          ? 'Reconnect to GridPlus'
          : 'Connect GridPlus Lattice'}
      </ModalHeader>
      <ModalBody>
        <Text mb={4} color='text.subtle'>
          {showPairingCode
            ? 'Enter the 8-character pairing code displayed on your Lattice device.'
            : hasExistingConnection
            ? 'Click below to reconnect to your GridPlus Lattice.'
            : 'Enter your device ID to connect to your GridPlus Lattice.'}
        </Text>

        <VStack spacing={4} align='stretch'>
          {!showPairingCode && !hasExistingConnection ? (
            <FormControl>
              <FormLabel>Device ID</FormLabel>
              <Input
                placeholder='Enter your Lattice device ID'
                value={deviceId}
                onChange={handleDeviceIdChange}
                onKeyDown={handleKeyDown}
                isDisabled={isLoading}
                type='password'
                autoComplete='off'
                autoFocus
              />
            </FormControl>
          ) : showPairingCode ? (
            <FormControl>
              <FormLabel>Pairing Code</FormLabel>
              <Input
                placeholder='Enter 8-character code from Lattice'
                value={pairingCode}
                onChange={handlePairingCodeChange}
                onKeyDown={handleKeyDown}
                isDisabled={isLoading}
                maxLength={8}
                pattern='[A-Z0-9]{8}'
                style={inputStyle}
                autoComplete='off'
                autoFocus
              />
            </FormControl>
          ) : null}

          {!showPairingCode && !hasExistingConnection && (
            <Box>
              <Text fontSize='sm' color='text.subtle'>
                You can find your device ID in your Lattice settings under Device Info.
              </Text>
            </Box>
          )}

          {showPairingCode && (
            <Box>
              <Text fontSize='sm' color='text.subtle'>
                Look at your Lattice screen for an 8-character pairing code.
              </Text>
            </Box>
          )}

          {error && (
            <Alert status='error'>
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
              spinner={spinnerElement}
              isDisabled
            >
              {showPairingCode
                ? 'Complete Pairing'
                : hasExistingConnection
                ? 'Reconnecting...'
                : 'Connect Device'}
            </Button>
          ) : (
            <Button
              width='full'
              colorScheme='blue'
              onClick={handleConnect}
              isDisabled={
                (!hasExistingConnection && !showPairingCode && !activeDeviceId.trim()) ||
                (showPairingCode && !pairingCode.trim())
              }
            >
              {showPairingCode
                ? 'Complete Pairing'
                : hasExistingConnection
                ? 'Reconnect'
                : 'Connect Device'}
            </Button>
          )}

          {showPairingCode && (
            <Box>
              <Text
                fontSize='sm'
                color='blue.500'
                cursor='pointer'
                onClick={resetPairingFlow}
                textDecoration='underline'
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
