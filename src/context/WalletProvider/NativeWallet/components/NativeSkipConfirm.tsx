import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { SkipConfirmModal } from '../../components/SkipConfirmModal'
import { NativeWalletRoutes } from '../../types'

export const NativeSkipConfirm = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const { vault } = location.state

  const handleConfirm = useCallback(() => {
    navigate(NativeWalletRoutes.Password, { state: { vault }, replace: true })
  }, [navigate, vault])

  const handleBack = useCallback(() => {
    navigate(NativeWalletRoutes.CreateTest, { state: { vault }, replace: true })
  }, [navigate, vault])

  return <SkipConfirmModal onConfirm={handleConfirm} onBack={handleBack} />
}
