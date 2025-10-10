import {
  Alert,
  AlertIcon,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  ModalBody,
  ModalHeader,
  PinInput,
  PinInputField,
  Spinner,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
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
  const translate = useTranslate()
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
  const [pendingSafeCardUuid, setPendingSafeCardUuid] = useState<string | null>(null)
  const [safeCardName, setSafeCardName] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [showPairingCode, setShowPairingCode] = useState(false)
  const [pairingCode, setPairingCode] = useState('')
  const [showNameScreen, setShowNameScreen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setErrorLoading = useCallback((e: string | null) => {
    setError(e)
    setIsLoading(false)
  }, [])

  const resetPairingFlow = useCallback(() => {
    setShowPairingCode(false)
    setPairingCode('')
    setPendingSafeCardUuid(null)
    setSelectedSafeCardId(null)
    setError(null)
    setIsLoading(false)
    if (safeCards.length > 0) {
      setShowSafeCardList(true)
    }
  }, [safeCards.length])

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
      } else if (pendingSafeCardUuid) {
        // Reuse pending SafeCard from pairing flow (prevents duplicates)
        safeCardUuid = pendingSafeCardUuid
      } else {
        // Creating new SafeCard with default name
        safeCardUuid = uuidv4()
        setPendingSafeCardUuid(safeCardUuid)
        const defaultName = (() => {
          let nextNum = safeCards.length + 1
          while (true) {
            const candidateName = `SafeCard ${nextNum}`
            if (!safeCards.some(card => card.name === candidateName)) {
              return candidateName
            }
            nextNum++
          }
        })()
        setSafeCardName(defaultName)
        appDispatch(
          gridplusSlice.actions.addSafeCard({
            id: safeCardUuid,
            name: defaultName,
          }),
        )
      }

      // Step 2: Determine device ID to use for connection
      const connectionDeviceId = physicalDeviceId || deviceId.trim()

      if (!connectionDeviceId) {
        throw new Error(translate('walletProvider.gridplus.errors.deviceIdRequired'))
      }

      // Step 3: Get adapter
      const adapterWithKeyring = (await getAdapter(KeyManager.GridPlus)) as any
      if (!adapterWithKeyring) {
        throw new Error(translate('walletProvider.gridplus.errors.adapterNotAvailable'))
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
          setShowNameScreen(true)
          setError(null)
          return
        }

        // Device was already paired, save the sessionId
        appDispatch(
          gridplusSlice.actions.setConnection({
            physicalDeviceId: connectionDeviceId,
            sessionId: newSessionId,
          }),
        )

        // Show name screen for already-paired devices
        if (!selectedSafeCardId) {
          setShowNameScreen(true)
          setIsLoading(false)
          return
        }
      }

      // Step 6: Pair/connect the device
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

      // Step 7: Save connection info if new pairing
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

      // Step 8: HERE'S THE KEY - Use SafeCard-specific walletId!
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

      // Update SafeCard name if it was changed
      if (pendingSafeCardUuid && safeCardName.trim()) {
        appDispatch(
          gridplusSlice.actions.updateSafeCardName({
            id: pendingSafeCardUuid,
            name: safeCardName.trim(),
          }),
        )
      }

      // Close modal and navigate after successful connection
      setPendingSafeCardUuid(null)
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
    pendingSafeCardUuid,
    safeCardName,
    deviceId,
    pairingCode,
    showPairingCode,
    physicalDeviceId,
    sessionId,
    safeCards,
    setErrorLoading,
    getAdapter,
    walletDispatch,
    appDispatch,
    localWallet,
    navigate,
    translate,
  ])

  const handleSafeCardNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSafeCardName(e.target.value)
  }, [])

  const handleDeviceIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDeviceId(e.target.value)
  }, [])

  const handlePairingCodeChange = useCallback((value: string) => {
    setPairingCode(value.toUpperCase())
  }, [])

  const handleNameSubmit = useCallback(async () => {
    if (showPairingCode) {
      await handleConnect()
    } else {
      if (pendingSafeCardUuid && safeCardName.trim()) {
        appDispatch(
          gridplusSlice.actions.updateSafeCardName({
            id: pendingSafeCardUuid,
            name: safeCardName.trim(),
          }),
        )
      }
      setPendingSafeCardUuid(null)
      walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      navigate('/')
    }
  }, [
    showPairingCode,
    handleConnect,
    pendingSafeCardUuid,
    safeCardName,
    appDispatch,
    walletDispatch,
    navigate,
  ])

  const spinnerElement = useMemo(() => <Spinner color='white' />, [])

  // Handler for SafeCard selection from list
  const handleSelectSafeCard = useCallback(
    async (id: string) => {
      setSelectedSafeCardId(id)
      setShowSafeCardList(false)
      setIsLoading(true)
      setError(null)

      try {
        const safeCardUuid = id
        appDispatch(gridplusSlice.actions.setActiveSafeCard(safeCardUuid))

        const connectionDeviceId = physicalDeviceId || deviceId.trim()

        if (!connectionDeviceId) {
          throw new Error(translate('walletProvider.gridplus.errors.deviceIdRequired'))
        }

        const adapterWithKeyring = (await getAdapter(KeyManager.GridPlus)) as any
        if (!adapterWithKeyring) {
          throw new Error(translate('walletProvider.gridplus.errors.adapterNotAvailable'))
        }

        if (!sessionId) {
          const { isPaired, sessionId: newSessionId } = await adapterWithKeyring.connectDevice(
            connectionDeviceId,
            undefined,
            undefined,
          )

          if (!isPaired) {
            setIsLoading(false)
            setShowPairingCode(true)
            setError(null)
            return
          }

          appDispatch(
            gridplusSlice.actions.setConnection({
              physicalDeviceId: connectionDeviceId,
              sessionId: newSessionId,
            }),
          )
        }

        const wallet = await adapterWithKeyring.pairDevice(
          connectionDeviceId,
          undefined,
          undefined,
          sessionId || undefined,
        )

        if (!sessionId && wallet.getSessionId) {
          const walletSessionId = wallet.getSessionId()
          appDispatch(
            gridplusSlice.actions.setConnection({
              physicalDeviceId: connectionDeviceId,
              sessionId: walletSessionId,
            }),
          )
        }

        const safeCardWalletId = `gridplus:${safeCardUuid}`

        walletDispatch({
          type: WalletActions.SET_WALLET,
          payload: {
            wallet,
            name: GridPlusConfig.name,
            icon: GridPlusConfig.icon,
            deviceId: safeCardWalletId,
            connectedType: KeyManager.GridPlus,
          },
        })

        walletDispatch({
          type: WalletActions.SET_IS_CONNECTED,
          payload: true,
        })

        localWallet.setLocalWallet({
          type: KeyManager.GridPlus,
          deviceId: safeCardWalletId,
          rdns: null,
        })

        walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
        navigate('/')
      } catch (e) {
        if (e instanceof Error && e.message === 'PAIRING_REQUIRED') {
          setIsLoading(false)
          setShowPairingCode(true)
          setError(null)
        } else {
          setErrorLoading(e instanceof Error ? e.message : 'Connection failed')
          setShowSafeCardList(true)
        }
      }
    },
    [
      physicalDeviceId,
      deviceId,
      sessionId,
      appDispatch,
      getAdapter,
      walletDispatch,
      localWallet,
      navigate,
      setErrorLoading,
      translate,
    ],
  )

  // Handler for adding new SafeCard
  const handleAddNew = useCallback(() => {
    const generateUniqueName = () => {
      let nextNum = safeCards.length + 1
      while (true) {
        const candidateName = `SafeCard ${nextNum}`
        if (!safeCards.some(card => card.name === candidateName)) {
          return candidateName
        }
        nextNum++
      }
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
    setPendingSafeCardUuid(null)
    setSafeCardName('')
  }, [])

  // Render SafeCard list if we have existing SafeCards and not adding new
  if (showSafeCardList && !isAddingNew) {
    return (
      <>
        <ModalHeader>{translate('walletProvider.gridplus.list.header')}</ModalHeader>
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

  // Render naming/pairing screen after device ID entry
  if (showNameScreen) {
    const buttonLabel = showPairingCode
      ? translate('walletProvider.gridplus.pair.button')
      : translate('common.done')
    const isSubmitDisabled = showPairingCode ? pairingCode.length !== 8 : false

    return (
      <>
        <ModalHeader>
          {showPairingCode
            ? translate('walletProvider.gridplus.pair.header')
            : translate('walletProvider.gridplus.name.header')}
        </ModalHeader>
        <ModalBody>
          <form
            onSubmit={e => {
              e.preventDefault()
              if (!isLoading && !isSubmitDisabled) {
                handleNameSubmit()
              }
            }}
          >
            <VStack spacing={4} align='stretch'>
              {showPairingCode && (
                <FormControl>
                  <FormLabel>{translate('walletProvider.gridplus.pair.pairingCode')}</FormLabel>
                  <HStack spacing={2}>
                    {/* TODO: Dev only - remove mask prop before shipping */}
                    <PinInput
                      type='alphanumeric'
                      value={pairingCode}
                      onChange={handlePairingCodeChange}
                      isDisabled={isLoading}
                      otp
                      mask
                      placeholder='_'
                      autoFocus
                    >
                      <PinInputField />
                      <PinInputField />
                      <PinInputField />
                      <PinInputField />
                      <PinInputField />
                      <PinInputField />
                      <PinInputField />
                      <PinInputField />
                    </PinInput>
                  </HStack>
                  <FormHelperText>
                    {translate('walletProvider.gridplus.pair.pairingCodeHelper')}
                  </FormHelperText>
                </FormControl>
              )}

              <FormControl>
                <FormLabel>{translate('walletProvider.gridplus.name.label')}</FormLabel>
                <Input
                  placeholder={translate('walletProvider.gridplus.name.placeholder')}
                  value={safeCardName}
                  onChange={handleSafeCardNameChange}
                  isDisabled={isLoading}
                  autoFocus={!showPairingCode}
                />
                <FormHelperText>{translate('walletProvider.gridplus.name.helper')}</FormHelperText>
              </FormControl>

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
                  loadingText={translate('walletProvider.gridplus.connect.connecting')}
                  spinner={spinnerElement}
                  isDisabled
                  type='submit'
                >
                  {buttonLabel}
                </Button>
              ) : (
                <Button width='full' colorScheme='blue' type='submit' isDisabled={isSubmitDisabled}>
                  {buttonLabel}
                </Button>
              )}

              {showPairingCode && (
                <Button variant='ghost' type='button' onClick={resetPairingFlow}>
                  {translate('walletProvider.gridplus.pair.cancel')}
                </Button>
              )}
            </VStack>
          </form>
        </ModalBody>
      </>
    )
  }

  // Render new SafeCard connection form
  return (
    <>
      <ModalHeader>{translate('walletProvider.gridplus.connect.header')}</ModalHeader>
      <ModalBody>
        <form
          onSubmit={e => {
            e.preventDefault()
            if (!isLoading && (physicalDeviceId || deviceId)) {
              handleConnect()
            }
          }}
        >
          <VStack spacing={4} align='stretch'>
            {!physicalDeviceId && (
              <FormControl>
                <FormLabel>{translate('walletProvider.gridplus.connect.deviceId')}</FormLabel>
                <Input
                  placeholder={translate('walletProvider.gridplus.connect.deviceIdPlaceholder')}
                  value={deviceId}
                  onChange={handleDeviceIdChange}
                  isDisabled={isLoading}
                  type='password'
                  autoComplete='off'
                  autoFocus
                />
                <FormHelperText>
                  {translate('walletProvider.gridplus.connect.deviceIdHelper')}
                </FormHelperText>
              </FormControl>
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
                loadingText={translate('walletProvider.gridplus.connect.connecting')}
                spinner={spinnerElement}
                isDisabled
                type='submit'
              >
                {translate('walletProvider.gridplus.connect.connecting')}
              </Button>
            ) : (
              <Button
                width='full'
                colorScheme='blue'
                type='submit'
                isDisabled={!physicalDeviceId && !deviceId}
              >
                {translate('walletProvider.gridplus.connect.button')}
              </Button>
            )}

            {isAddingNew && (
              <Button variant='ghost' type='button' onClick={handleBackToList}>
                {translate('walletProvider.gridplus.connect.backToList')}
              </Button>
            )}
          </VStack>
        </form>
      </ModalBody>
    </>
  )
}
