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
import type { GridPlusAdapter, GridPlusHDWallet } from '@shapeshiftoss/hdwallet-gridplus'
import { useCallback, useState } from 'react'
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

const SPINNER_ELEMENT = <Spinner color='white' />

export const GridPlusConnect = () => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const { getAdapter, dispatch: walletDispatch } = useWallet()
  const localWallet = useLocalWallet()
  const appDispatch = useAppDispatch()

  const safeCards = useAppSelector(gridplusSlice.selectors.selectSafeCards)
  const physicalDeviceId = useAppSelector(gridplusSlice.selectors.selectPhysicalDeviceId)
  const sessionId = useAppSelector(gridplusSlice.selectors.selectSessionId)

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

  const buttonLabel = showPairingCode
    ? translate('walletProvider.gridplus.pair.button')
    : translate('common.done')
  const isSubmitDisabled = showPairingCode ? pairingCode.length !== 8 : false

  const handleSafeCardNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSafeCardName(e.target.value)
  }, [])

  const handleDeviceIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDeviceId(e.target.value)
  }, [])

  const handlePairingCodeChange = useCallback((value: string) => {
    setPairingCode(value.toUpperCase())
  }, [])

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

  const handleBackToList = useCallback(() => {
    setShowSafeCardList(true)
    setIsAddingNew(false)
    setSelectedSafeCardId(null)
    setPendingSafeCardUuid(null)
    setSafeCardName('')
  }, [])

  const getAdapterWithKeyring = useCallback(async (): Promise<GridPlusAdapter> => {
    const adapter = (await getAdapter(KeyManager.GridPlus)) as GridPlusAdapter | null
    if (!adapter) {
      throw new Error(translate('walletProvider.gridplus.errors.adapterNotAvailable'))
    }
    return adapter
  }, [getAdapter, translate])

  const storeConnection = useCallback(
    (deviceId: string, sessionId: string) => {
      appDispatch(
        gridplusSlice.actions.setConnection({
          physicalDeviceId: deviceId,
          sessionId,
        }),
      )
    },
    [appDispatch],
  )

  const finalizeWalletSetup = useCallback(
    (wallet: GridPlusHDWallet, safeCardWalletId: string) => {
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
    },
    [walletDispatch, localWallet, navigate],
  )

  const handleDeviceConnectionError = useCallback(
    (error: unknown, onOtherError?: () => void) => {
      if (error instanceof Error && error.message === 'PAIRING_REQUIRED') {
        setIsLoading(false)
        setShowPairingCode(true)
        setError(null)
      } else {
        setErrorLoading(error instanceof Error ? error.message : 'Connection failed')
        onOtherError?.()
      }
    },
    [setErrorLoading],
  )

  const getConnectionDeviceId = useCallback(() => {
    const connectionDeviceId = physicalDeviceId || deviceId.trim()
    if (!connectionDeviceId) {
      throw new Error(translate('walletProvider.gridplus.errors.deviceIdRequired'))
    }
    return connectionDeviceId
  }, [physicalDeviceId, deviceId, translate])

  const generateDefaultSafeCardName = useCallback(
    () => `GridPlus ${safeCards.length + 1}`,
    [safeCards.length],
  )

  const handleConnect = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const safeCardUuid = (() => {
        if (selectedSafeCardId) {
          appDispatch(gridplusSlice.actions.setActiveSafeCard(selectedSafeCardId))
          return selectedSafeCardId
        }

        if (pendingSafeCardUuid) {
          return pendingSafeCardUuid
        }

        const newUuid = uuidv4()
        setPendingSafeCardUuid(newUuid)
        const defaultName = generateDefaultSafeCardName()
        setSafeCardName(defaultName)
        appDispatch(
          gridplusSlice.actions.addSafeCard({
            id: newUuid,
            name: defaultName,
          }),
        )
        return newUuid
      })()

      const safeCardWalletId = `gridplus:${safeCardUuid}`

      const connectionDeviceId = getConnectionDeviceId()

      const adapterWithKeyring = await getAdapterWithKeyring()

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

        storeConnection(connectionDeviceId, newSessionId)

        if (!selectedSafeCardId) {
          setShowNameScreen(true)
          setIsLoading(false)
          return
        }
      }

      const wallet = await (async () => {
        if (showPairingCode && pairingCode) {
          return adapterWithKeyring.pairConnectedDevice(connectionDeviceId, pairingCode)
        }
        return adapterWithKeyring.pairDevice(
          connectionDeviceId,
          undefined,
          undefined,
          sessionId || undefined,
        )
      })()

      if (!sessionId && wallet.getSessionId) {
        const walletSessionId = wallet.getSessionId()
        storeConnection(connectionDeviceId, walletSessionId)
      }

      if (pendingSafeCardUuid && safeCardName.trim()) {
        appDispatch(
          gridplusSlice.actions.updateSafeCardName({
            id: pendingSafeCardUuid,
            name: safeCardName.trim(),
          }),
        )
      }

      setPendingSafeCardUuid(null)
      finalizeWalletSetup(wallet, safeCardWalletId)
    } catch (e) {
      handleDeviceConnectionError(e)
    }
  }, [
    selectedSafeCardId,
    pendingSafeCardUuid,
    safeCardName,
    pairingCode,
    showPairingCode,
    sessionId,
    generateDefaultSafeCardName,
    getConnectionDeviceId,
    getAdapterWithKeyring,
    storeConnection,
    finalizeWalletSetup,
    handleDeviceConnectionError,
    appDispatch,
  ])

  const handleNameSubmit = useCallback(async () => {
    await handleConnect()
  }, [handleConnect])

  const handleSelectSafeCard = useCallback(
    async (id: string) => {
      setSelectedSafeCardId(id)
      setShowSafeCardList(false)
      setIsLoading(true)
      setError(null)

      try {
        appDispatch(gridplusSlice.actions.setActiveSafeCard(id))

        const safeCardWalletId = `gridplus:${id}`

        const connectionDeviceId = getConnectionDeviceId()

        const adapterWithKeyring = await getAdapterWithKeyring()

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

          storeConnection(connectionDeviceId, newSessionId)
        }

        const wallet = await adapterWithKeyring.pairDevice(
          connectionDeviceId,
          undefined,
          undefined,
          sessionId || undefined,
        )

        if (!sessionId && wallet.getSessionId) {
          const walletSessionId = wallet.getSessionId()
          storeConnection(connectionDeviceId, walletSessionId)
        }

        finalizeWalletSetup(wallet, safeCardWalletId)
      } catch (e) {
        handleDeviceConnectionError(e, () => setShowSafeCardList(true))
      }
    },
    [
      sessionId,
      appDispatch,
      getConnectionDeviceId,
      getAdapterWithKeyring,
      storeConnection,
      finalizeWalletSetup,
      handleDeviceConnectionError,
    ],
  )

  const handleAddNew = useCallback(() => {
    const defaultName = generateDefaultSafeCardName()
    const newUuid = uuidv4()

    setIsAddingNew(true)
    setPendingSafeCardUuid(newUuid)
    setSafeCardName(defaultName)
    setShowSafeCardList(false)

    appDispatch(
      gridplusSlice.actions.addSafeCard({
        id: newUuid,
        name: defaultName,
      }),
    )

    if (physicalDeviceId) {
      setShowNameScreen(true)
    }
  }, [generateDefaultSafeCardName, physicalDeviceId, appDispatch])

  if (showSafeCardList && !isAddingNew) {
    return (
      <>
        <ModalHeader>{translate('walletProvider.gridplus.list.header')}</ModalHeader>
        <ModalBody>
          <SafeCardList
            safeCards={safeCards}
            onSelectSafeCard={handleSelectSafeCard}
            onAddNewSafeCard={handleAddNew}
            error={error}
          />
        </ModalBody>
      </>
    )
  }

  if (showNameScreen) {
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
                    <PinInput
                      type='alphanumeric'
                      value={pairingCode}
                      onChange={handlePairingCodeChange}
                      isDisabled={isLoading}
                      otp
                      placeholder='_'
                      autoFocus
                    >
                      {Array.from({ length: 8 }).map((_, i) => (
                        <PinInputField key={i} />
                      ))}
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
                  spinner={SPINNER_ELEMENT}
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
                  type='text'
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
                spinner={SPINNER_ELEMENT}
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
