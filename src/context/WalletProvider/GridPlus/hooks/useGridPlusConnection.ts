import type { GridPlusAdapter } from '@shapeshiftoss/hdwallet-gridplus'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

import { connectAndPairDevice, finalizeWalletSetup } from '../utils'

import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { gridplusSlice } from '@/state/slices/gridplusSlice/gridplusSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useGridPlusConnection = () => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const { getAdapter, dispatch: walletDispatch } = useWallet()
  const localWallet = useLocalWallet()
  const appDispatch = useAppDispatch()

  const safeCards = useAppSelector(gridplusSlice.selectors.selectSafeCards)
  const physicalDeviceId = useAppSelector(gridplusSlice.selectors.selectPhysicalDeviceId)
  const sessionId = useAppSelector(gridplusSlice.selectors.selectSessionId)

  const [isAddingNew, setIsAddingNew] = useState(false)
  const [connectingCardId, setConnectingCardId] = useState<string | null>(null)
  const [pendingSafeCardUuid, setPendingSafeCardUuid] = useState<string | null>(null)
  const [deviceId, setDeviceId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDeviceIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDeviceId(e.target.value)
  }, [])

  const setErrorLoading = useCallback((error: string | null) => {
    setError(error)
    setIsLoading(false)
  }, [])

  const handleBackToList = useCallback(() => {
    if (pendingSafeCardUuid) {
      appDispatch(gridplusSlice.actions.removeSafeCard(pendingSafeCardUuid))
    }
    setIsAddingNew(false)
    setPendingSafeCardUuid(null)
  }, [pendingSafeCardUuid, appDispatch])

  const getAdapterWithKeyring = useCallback(async (): Promise<GridPlusAdapter> => {
    const adapter = (await getAdapter(KeyManager.GridPlus)) as GridPlusAdapter | null
    if (!adapter) {
      throw new Error(translate('walletProvider.gridplus.errors.adapterNotAvailable'))
    }
    return adapter
  }, [getAdapter, translate])

  const getConnectionDeviceId = useCallback(() => {
    const connectionDeviceId = physicalDeviceId || deviceId.trim()
    if (!connectionDeviceId) {
      throw new Error(translate('walletProvider.gridplus.errors.deviceIdRequired'))
    }
    return connectionDeviceId
  }, [physicalDeviceId, deviceId, translate])

  const defaultSafeCardName = useMemo(() => `GridPlus ${safeCards.length + 1}`, [safeCards.length])

  const handleConnect = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (isLoading || (!physicalDeviceId && !deviceId)) return

      setIsLoading(true)
      setError(null)

      try {
        const safeCardUuid =
          pendingSafeCardUuid ||
          (() => {
            const newUuid = uuidv4()
            setPendingSafeCardUuid(newUuid)
            return newUuid
          })()

        const safeCardWalletId = `gridplus:${safeCardUuid}`
        const connectionDeviceId = getConnectionDeviceId()
        const adapter = await getAdapterWithKeyring()

        const wallet = await connectAndPairDevice({
          adapter,
          deviceId: connectionDeviceId,
          sessionId: sessionId ?? undefined,
          dispatch: appDispatch,
        })

        if (!wallet) {
          navigate('/gridplus/pair', {
            state: { safeCardUuid, deviceId: connectionDeviceId },
          })
          return
        }

        navigate('/gridplus/setup', {
          state: {
            safeCardUuid,
            wallet,
            safeCardWalletId,
            defaultName: defaultSafeCardName,
          },
        })
      } catch (e) {
        setErrorLoading((e as Error).message)
      }
    },
    [
      isLoading,
      physicalDeviceId,
      deviceId,
      pendingSafeCardUuid,
      defaultSafeCardName,
      getConnectionDeviceId,
      getAdapterWithKeyring,
      sessionId,
      appDispatch,
      navigate,
      setErrorLoading,
    ],
  )

  const handleSelectSafeCard = useCallback(
    async (id: string) => {
      setConnectingCardId(id)
      setError(null)

      try {
        appDispatch(gridplusSlice.actions.setActiveSafeCard(id))

        const safeCardWalletId = `gridplus:${id}`
        const connectionDeviceId = getConnectionDeviceId()
        const adapter = await getAdapterWithKeyring()

        const wallet = await connectAndPairDevice({
          adapter,
          deviceId: connectionDeviceId,
          sessionId: sessionId ?? undefined,
          dispatch: appDispatch,
        })

        if (!wallet) {
          setConnectingCardId(null)
          navigate('/gridplus/pair', {
            state: { safeCardUuid: id, deviceId: connectionDeviceId },
          })
          return
        }

        finalizeWalletSetup({
          wallet,
          safeCardWalletId,
          walletDispatch,
          localWallet,
          navigate,
          appDispatch,
        })
      } catch (e) {
        setConnectingCardId(null)
        setErrorLoading((e as Error).message)
      }
    },
    [
      appDispatch,
      getConnectionDeviceId,
      getAdapterWithKeyring,
      sessionId,
      walletDispatch,
      localWallet,
      navigate,
      setErrorLoading,
    ],
  )

  const handleAddNew = useCallback(() => {
    const newUuid = uuidv4()

    if (physicalDeviceId) {
      navigate('/gridplus/setup', {
        state: {
          safeCardUuid: newUuid,
          defaultName: defaultSafeCardName,
        },
      })
    } else {
      setIsAddingNew(true)
      setPendingSafeCardUuid(newUuid)
    }
  }, [physicalDeviceId, defaultSafeCardName, navigate])

  return {
    safeCards,
    physicalDeviceId,
    isAddingNew,
    connectingCardId,
    deviceId,
    isLoading,
    error,
    handleDeviceIdChange,
    handleBackToList,
    handleConnect,
    handleSelectSafeCard,
    handleAddNew,
  }
}
