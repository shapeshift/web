import {
  Alert,
  AlertIcon,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  ModalBody,
  ModalHeader,
  Spinner,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

import { GridPlusConfig } from '../config'
import { SafeCardList } from './SafeCardList'

import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { gridplusSlice } from '@/state/slices/gridplusSlice/gridplusSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const GridPlusConnect = () => {
  const navigate = useNavigate()
  const { getAdapter, dispatch: walletDispatch } = useWallet()
  const localWallet = useLocalWallet()
  const appDispatch = useAppDispatch()

  // Get GridPlus state from new slice
  const safeCards = useAppSelector(gridplusSlice.selectors.selectSafeCards)
  const physicalDeviceId = useAppSelector(gridplusSlice.selectors.selectPhysicalDeviceId)
  const sessionId = useAppSelector(gridplusSlice.selectors.selectSessionId)

  // UI state
  const [showSafeCardList, setShowSafeCardList] = useState(safeCards.length > 0)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [selectedSafeCardId, setSelectedSafeCardId] = useState<string | null>(null)
  const [safeCardName, setSafeCardName] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [showPairingCode, setShowPairingCode] = useState(false)
  const [pairingCode, setPairingCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      // Step 1: Determine or create SafeCard UUID
      let safeCardUuid: string

      if (selectedSafeCardId) {
        // Reconnecting to existing SafeCard
        safeCardUuid = selectedSafeCardId
        appDispatch(gridplusSlice.actions.setActiveSafeCard(safeCardUuid))
      } else {
        // Creating new SafeCard with specific UUID
        safeCardUuid = uuidv4()
        appDispatch(
          gridplusSlice.actions.addSafeCard({
            id: safeCardUuid,
            name: safeCardName || `SafeCard ${safeCards.length + 1}`,
          }),
        )
      }

      // Step 2: Determine device ID to use for connection
      const connectionDeviceId = physicalDeviceId || deviceId.trim()

      if (!connectionDeviceId) {
        throw new Error('Device ID is required')
      }

      // Step 3: Get adapter
      const adapterWithKeyring = (await getAdapter(KeyManager.GridPlus)) as any
      if (!adapterWithKeyring) {
        throw new Error('GridPlus adapter not available')
      }

      // Step 4: Check pairing status if no existing sessionId
      if (!sessionId && !showPairingCode) {
        const { isPaired, sessionId: newSessionId } = await adapterWithKeyring.connectDevice(
          connectionDeviceId,
          undefined,
          undefined,
        )

        if (!isPaired) {
          setIsLoading(false)
          setShowPairingCode(true)
          setError(null)
          return // Wait for pairing code
        }

        // Device was already paired, save the sessionId
        appDispatch(
          gridplusSlice.actions.setConnection({
            physicalDeviceId: connectionDeviceId,
            sessionId: newSessionId,
          }),
        )
      }

      // Step 5: Pair/connect the device
      let wallet
      if (showPairingCode && pairingCode) {
        // New pairing with code
        wallet = await adapterWithKeyring.pairConnectedDevice(connectionDeviceId, pairingCode)
      } else {
        // Connect with existing pairing
        wallet = await adapterWithKeyring.pairDevice(
          connectionDeviceId,
          undefined,
          undefined,
          sessionId || undefined,
        )
      }

      // Step 6: Save connection info if new pairing
      // sessionId is used for fast reconnection without device communication
      if (!sessionId && wallet.getSessionId) {
        const walletSessionId = wallet.getSessionId()
        appDispatch(
          gridplusSlice.actions.setConnection({
            physicalDeviceId: connectionDeviceId,
            sessionId: walletSessionId,
          }),
        )
      }

      // Step 7: HERE'S THE KEY - Use SafeCard-specific walletId!
      const safeCardWalletId = `gridplus:${safeCardUuid}`

      // The wallet gets stored in keyring with this ID
      walletDispatch({
        type: WalletActions.SET_WALLET,
        payload: {
          wallet,
          name: GridPlusConfig.name,
          icon: GridPlusConfig.icon,
          deviceId: safeCardWalletId, // This is what makes each SafeCard unique!
          connectedType: KeyManager.GridPlus,
        },
      })

      walletDispatch({
        type: WalletActions.SET_IS_CONNECTED,
        payload: true,
      })

      // Save to local wallet for persistence
      localWallet.setLocalWallet({
        type: KeyManager.GridPlus,
        deviceId: safeCardWalletId, // Same ID here
        rdns: null,
      })

      // Close modal and navigate
      walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
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
    selectedSafeCardId,
    safeCardName,
    deviceId,
    pairingCode,
    showPairingCode,
    physicalDeviceId,
    sessionId,
    safeCards.length,
    setErrorLoading,
    getAdapter,
    walletDispatch,
    appDispatch,
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

  const handleSafeCardNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSafeCardName(e.target.value)
  }, [])

  const handleDeviceIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDeviceId(e.target.value)
  }, [])

  const handlePairingCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPairingCode(e.target.value.toUpperCase())
  }, [])

  const inputStyle = useMemo(() => ({ textTransform: 'uppercase' as const }), [])

  const spinnerElement = useMemo(() => <Spinner color='white' />, [])

  // Handler for SafeCard selection from list
  const handleSelectSafeCard = useCallback((id: string) => {
    setSelectedSafeCardId(id)
    setShowSafeCardList(false)
  }, [])

  // Handler for adding new SafeCard
  const handleAddNew = useCallback(() => {
    // Start with length + 1, then increment until we find an unused name
    const generateUniqueName = () => {
      let nextNum = safeCards.length + 1
      // eslint-disable-next-line no-loop-func
      while (safeCards.some(card => card.name === `SafeCard ${nextNum}`)) {
        nextNum++
      }
      return `SafeCard ${nextNum}`
    }

    setIsAddingNew(true)
    setSafeCardName(generateUniqueName())
    setShowSafeCardList(false)
  }, [safeCards])

  // Handler for back to list button
  const handleBackToList = useCallback(() => {
    setShowSafeCardList(true)
    setIsAddingNew(false)
    setSelectedSafeCardId(null)
    setSafeCardName('')
  }, [])

  // Render SafeCard list if we have existing SafeCards and not adding new
  if (showSafeCardList && !isAddingNew) {
    return (
      <>
        <ModalHeader>Your GridPlus SafeCards</ModalHeader>
        <ModalBody>
          <SafeCardList
            safeCards={safeCards}
            onSelectSafeCard={handleSelectSafeCard}
            onAddNew={handleAddNew}
          />
        </ModalBody>
      </>
    )
  }

  // Render connection form
  return (
    <>
      <ModalHeader>
        {showPairingCode
          ? 'Pair GridPlus Lattice'
          : selectedSafeCardId
          ? 'Reconnect SafeCard'
          : 'Connect New SafeCard'}
      </ModalHeader>
      <ModalBody>
        <VStack spacing={4} align='stretch'>
          {/* SafeCard name input for new connections */}
          {!selectedSafeCardId && !showPairingCode && (
            <FormControl>
              <FormLabel>SafeCard Name</FormLabel>
              <Input
                placeholder='Enter a name for this SafeCard'
                value={safeCardName}
                onChange={handleSafeCardNameChange}
                autoFocus
              />
              <FormHelperText>
                Give this SafeCard a memorable name (e.g., "Main Wallet", "Trading", "DeFi")
              </FormHelperText>
            </FormControl>
          )}

          {/* Device ID input only if we don't have one saved */}
          {!physicalDeviceId && !showPairingCode && (
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
              />
              <FormHelperText>
                You can find your device ID in your Lattice settings under Device Info.
              </FormHelperText>
            </FormControl>
          )}

          {/* Pairing code input */}
          {showPairingCode && (
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
              <FormHelperText>
                Look at your Lattice screen for an 8-character pairing code.
              </FormHelperText>
            </FormControl>
          )}

          {/* Error display */}
          {error && (
            <Alert status='error'>
              <AlertIcon />
              {error}
            </Alert>
          )}

          {/* Action buttons */}
          {isLoading ? (
            <Button
              width='full'
              colorScheme='blue'
              isLoading
              loadingText='Connecting...'
              spinner={spinnerElement}
              isDisabled
            >
              {showPairingCode ? 'Complete Pairing' : 'Connecting...'}
            </Button>
          ) : (
            <Button
              width='full'
              colorScheme='blue'
              onClick={handleConnect}
              isDisabled={
                (!physicalDeviceId && !deviceId) || (showPairingCode && pairingCode.length !== 8)
              }
            >
              {showPairingCode
                ? 'Complete Pairing'
                : selectedSafeCardId
                ? 'Reconnect'
                : 'Connect SafeCard'}
            </Button>
          )}

          {/* Back button */}
          {(isAddingNew || selectedSafeCardId) && !showPairingCode && (
            <Button variant='ghost' onClick={handleBackToList}>
              ← Back to SafeCard List
            </Button>
          )}

          {showPairingCode && (
            <Button variant='ghost' onClick={resetPairingFlow}>
              ← Back to Device ID
            </Button>
          )}
        </VStack>
      </ModalBody>
    </>
  )
}
