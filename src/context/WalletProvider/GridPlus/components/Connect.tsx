import { ModalBody, ModalHeader } from '@chakra-ui/react'
import type { GridPlusAdapter, GridPlusHDWallet } from '@shapeshiftoss/hdwallet-gridplus'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

import { GridPlusConfig } from '../config'
import { InitialConnection } from './InitialConnection'
import { SafeCardList } from './SafeCardList'
import { Setup } from './Setup'

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

  const safeCards = useAppSelector(gridplusSlice.selectors.selectSafeCards)
  const physicalDeviceId = useAppSelector(gridplusSlice.selectors.selectPhysicalDeviceId)
  const sessionId = useAppSelector(gridplusSlice.selectors.selectSessionId)

  const [showSafeCardList, setShowSafeCardList] = useState(safeCards.length > 0)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [selectedSafeCardId, setSelectedSafeCardId] = useState<string | null>(null)
  const [connectingCardId, setConnectingCardId] = useState<string | null>(null)
  const [pendingSafeCardUuid, setPendingSafeCardUuid] = useState<string | null>(null)
  const [safeCardName, setSafeCardName] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [showPairingCode, setShowPairingCode] = useState(false)
  const [pairingCode, setPairingCode] = useState('')
  const [showSetupForm, setShowSetupForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const defaultSafeCardName = useMemo(() => `GridPlus ${safeCards.length + 1}`, [safeCards.length])

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
        setSafeCardName(defaultSafeCardName)
        appDispatch(
          gridplusSlice.actions.addSafeCard({
            id: newUuid,
            name: defaultSafeCardName,
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
          setShowSetupForm(true)
          setError(null)
          return
        }

        storeConnection(connectionDeviceId, newSessionId)

        if (!selectedSafeCardId) {
          setShowSetupForm(true)
          setIsLoading(false)
          return
        }
      }

      const wallet = await (showPairingCode && pairingCode
        ? adapterWithKeyring.pairConnectedDevice(connectionDeviceId, pairingCode)
        : adapterWithKeyring.pairDevice(
            connectionDeviceId,
            undefined,
            undefined,
            sessionId || undefined,
          ))

      if (!sessionId && wallet.getSessionId) {
        const walletSessionId = wallet.getSessionId()
        if (walletSessionId) {
          storeConnection(connectionDeviceId, walletSessionId)
        }
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
    defaultSafeCardName,
    getConnectionDeviceId,
    getAdapterWithKeyring,
    storeConnection,
    finalizeWalletSetup,
    handleDeviceConnectionError,
    appDispatch,
  ])

  const handleSelectSafeCard = useCallback(
    async (id: string) => {
      setSelectedSafeCardId(id)
      setConnectingCardId(id)
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
            setConnectingCardId(null)
            setShowSafeCardList(false)
            setShowPairingCode(true)
            setShowSetupForm(true)
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
          if (walletSessionId) {
            storeConnection(connectionDeviceId, walletSessionId)
          }
        }

        finalizeWalletSetup(wallet, safeCardWalletId)
      } catch (e) {
        setConnectingCardId(null)
        handleDeviceConnectionError(e)
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
    const newUuid = uuidv4()

    setIsAddingNew(true)
    setPendingSafeCardUuid(newUuid)
    setSafeCardName(defaultSafeCardName)
    setShowSafeCardList(false)

    appDispatch(
      gridplusSlice.actions.addSafeCard({
        id: newUuid,
        name: defaultSafeCardName,
      }),
    )

    if (physicalDeviceId) {
      setShowSetupForm(true)
    }
  }, [defaultSafeCardName, physicalDeviceId, appDispatch])

  if (showSafeCardList && !isAddingNew) {
    return (
      <>
        <ModalHeader>{translate('walletProvider.gridplus.list.header')}</ModalHeader>
        <ModalBody>
          <SafeCardList
            safeCards={safeCards}
            onSelectSafeCard={handleSelectSafeCard}
            onAddNewSafeCard={handleAddNew}
            connectingCardId={connectingCardId}
            error={error}
          />
        </ModalBody>
      </>
    )
  }

  if (showSetupForm) {
    return (
      <Setup
        showPairingCode={showPairingCode}
        pairingCode={pairingCode}
        onPairingCodeChange={handlePairingCodeChange}
        safeCardName={safeCardName}
        onSafeCardNameChange={handleSafeCardNameChange}
        error={error}
        isLoading={isLoading}
        onSubmit={handleConnect}
        onCancel={resetPairingFlow}
      />
    )
  }

  return (
    <InitialConnection
      physicalDeviceId={physicalDeviceId}
      deviceId={deviceId}
      onDeviceIdChange={handleDeviceIdChange}
      error={error}
      isLoading={isLoading}
      isAddingNew={isAddingNew}
      onSubmit={handleConnect}
      onBackToList={handleBackToList}
    />
  )
}
