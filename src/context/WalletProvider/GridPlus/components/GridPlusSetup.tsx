import type { GridPlusHDWallet } from '@shapeshiftoss/hdwallet-gridplus'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useLocation, useNavigate } from 'react-router-dom'

import { Setup } from './Setup'

import { WalletActions } from '@/context/WalletProvider/actions'
import { GridPlusConfig } from '@/context/WalletProvider/GridPlus/config'
import { connectAndPairDevice, pairConnectedDevice } from '@/context/WalletProvider/GridPlus/utils'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { gridplusSlice } from '@/state/slices/gridplusSlice/gridplusSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

type LocationState = {
  safeCardUuid: string
  wallet?: GridPlusHDWallet
  safeCardWalletId?: string
  defaultName?: string
  needsPairing?: boolean
  deviceId?: string
  activeWalletId?: string
  type?: 'external' | 'internal'
}

export const GridPlusSetup = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const translate = useTranslate()
  const { dispatch: walletDispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()
  const appDispatch = useAppDispatch()

  const physicalDeviceId = useAppSelector(gridplusSlice.selectors.selectPhysicalDeviceId)

  const state = location.state as LocationState | undefined
  const safeCardUuid = state?.safeCardUuid
  const needsPairing = state?.needsPairing
  const deviceId = state?.deviceId
  const defaultName = state?.defaultName || ''

  const [wallet, setWallet] = useState<GridPlusHDWallet | undefined>(state?.wallet)
  const [pairingCode, setPairingCode] = useState('')
  const [safeCardName, setSafeCardName] = useState(defaultName)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSafeCardNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSafeCardName(e.target.value)
  }, [])

  const handlePairingCodeChange = useCallback((pairingCode: string) => {
    setPairingCode(pairingCode.toUpperCase())
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (isLoading || !safeCardUuid || (needsPairing && pairingCode.length !== 8)) return

      setIsLoading(true)
      setError(null)

      try {
        let finalWallet = wallet
        // Use activeWalletId and type from state if available (from pairing flow)
        let activeWalletId: string | undefined = state?.activeWalletId
        let type: 'external' | 'internal' | undefined = state?.type

        if (!finalWallet) {
          const adapter = await getAdapter(KeyManager.GridPlus)

          if (!adapter) {
            throw new Error(translate('walletProvider.gridplus.errors.adapterNotAvailable'))
          }

          if (needsPairing) {
            if (!deviceId) {
              throw new Error(translate('walletProvider.gridplus.errors.deviceIdRequired'))
            }
            const result = await pairConnectedDevice({
              adapter,
              pairingCode,
            })
            finalWallet = result.wallet
            activeWalletId = result.activeWalletId
            type = result.type
          } else {
            const connectionDeviceId = physicalDeviceId || deviceId || state?.deviceId
            if (!connectionDeviceId) {
              throw new Error(translate('walletProvider.gridplus.errors.deviceIdRequired'))
            }

            const result = await connectAndPairDevice({
              adapter,
              deviceId: connectionDeviceId,
              dispatch: appDispatch,
            })
            finalWallet = result ?? undefined
          }

          if (finalWallet) {
            setWallet(finalWallet)
          }
        }

        if (!finalWallet) {
          throw new Error(translate('walletProvider.gridplus.errors.walletNotAvailable'))
        }

        // If we don't have activeWalletId yet (e.g., when adding new SafeCard with existing wallet),
        // we need to fetch it from the wallet
        if (activeWalletId === undefined || type === undefined) {
          const validation = await finalWallet.validateActiveWallet()
          activeWalletId = validation.activeWalletId
          type = validation.type
        }

        if (activeWalletId && type) {
          finalWallet.setExpectedActiveWalletId(activeWalletId, type)
        }

        const safeCardWalletId = state?.safeCardWalletId || `gridplus:${safeCardUuid}`
        const finalSafeCardName = safeCardName.trim() || defaultName

        appDispatch(
          gridplusSlice.actions.addSafeCard({
            id: safeCardUuid,
            name: finalSafeCardName,
            activeWalletId,
            type,
          }),
        )

        appDispatch(gridplusSlice.actions.setActiveSafeCard(safeCardUuid))

        const cardUuid = safeCardWalletId.replace('gridplus:', '')

        walletDispatch({
          type: WalletActions.SET_WALLET,
          payload: {
            wallet: finalWallet,
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

        appDispatch(gridplusSlice.actions.setLastConnectedAt(cardUuid))

        walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
        navigate('/')
      } catch (err) {
        setError((err as Error).message)
        setIsLoading(false)
      }
    },
    [
      isLoading,
      safeCardUuid,
      wallet,
      needsPairing,
      deviceId,
      pairingCode,
      safeCardName,
      defaultName,
      state?.safeCardWalletId,
      state?.deviceId,
      state?.activeWalletId,
      state?.type,
      physicalDeviceId,
      translate,
      getAdapter,
      walletDispatch,
      localWallet,
      navigate,
      appDispatch,
    ],
  )

  return (
    <Setup
      showPairingCode={needsPairing && !wallet}
      pairingCode={pairingCode}
      onPairingCodeChange={handlePairingCodeChange}
      safeCardName={safeCardName}
      onSafeCardNameChange={handleSafeCardNameChange}
      error={error}
      isLoading={isLoading}
      onSubmit={handleSubmit}
    />
  )
}
