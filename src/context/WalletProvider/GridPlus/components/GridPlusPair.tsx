import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useLocation, useNavigate } from 'react-router-dom'

import { Pair } from './Pair'

import { pairConnectedDevice } from '@/context/WalletProvider/GridPlus/utils'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { gridplusSlice } from '@/state/slices/gridplusSlice/gridplusSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

type LocationState = {
  safeCardUuid: string
  deviceId: string
}

export const GridPlusPair = () => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const location = useLocation()
  const { getAdapter } = useWallet()
  const appDispatch = useAppDispatch()

  const physicalDeviceId = useAppSelector(gridplusSlice.selectors.selectPhysicalDeviceId)

  const state = location.state as LocationState | undefined
  const safeCardUuid = state?.safeCardUuid
  const deviceId = state?.deviceId || physicalDeviceId

  const [pairingCode, setPairingCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePairingCodeChange = useCallback((pairingCode: string) => {
    setPairingCode(pairingCode.toUpperCase())
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (isLoading || pairingCode.length !== 8 || !safeCardUuid || !deviceId) return

      setIsLoading(true)
      setError(null)

      try {
        const adapter = await getAdapter(KeyManager.GridPlus)
        if (!adapter) {
          throw new Error(translate('walletProvider.gridplus.errors.adapterNotAvailable'))
        }

        const { wallet, activeWalletId, type } = await pairConnectedDevice({
          adapter,
          deviceId,
          pairingCode,
        })

        appDispatch(gridplusSlice.actions.setActiveSafeCard(safeCardUuid))

        navigate('/gridplus/setup', {
          state: {
            safeCardUuid,
            wallet,
            safeCardWalletId: `gridplus:${safeCardUuid}`,
            activeWalletId,
            type,
          },
        })
      } catch (err) {
        setError((err as Error).message)
        setIsLoading(false)
      }
    },
    [isLoading, pairingCode, safeCardUuid, deviceId, getAdapter, translate, appDispatch, navigate],
  )

  const handleCancel = useCallback(() => {
    navigate('/gridplus/connect')
  }, [navigate])

  return (
    <Pair
      pairingCode={pairingCode}
      onPairingCodeChange={handlePairingCodeChange}
      error={error}
      isLoading={isLoading}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  )
}
