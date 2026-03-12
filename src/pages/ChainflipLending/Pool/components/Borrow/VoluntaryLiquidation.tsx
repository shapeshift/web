import { memo, useEffect, useMemo } from 'react'

import { VoluntaryLiquidationConfirm } from './VoluntaryLiquidationConfirm'
import { VoluntaryLiquidationMachineCtx } from './VoluntaryLiquidationMachineContext'

import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useWallet } from '@/hooks/useWallet/useWallet'

type VoluntaryLiquidationProps = {
  action: 'initiate' | 'stop'
  onDone?: () => void
}

export const VoluntaryLiquidation = memo(({ action, onDone }: VoluntaryLiquidationProps) => {
  const { connectedType } = useWallet().state
  const isNativeWallet = connectedType === KeyManager.Native
  const input = useMemo(() => ({ action, isNativeWallet }), [action, isNativeWallet])

  return (
    <VoluntaryLiquidationMachineCtx.Provider options={{ input }}>
      <VoluntaryLiquidationContent onDone={onDone} />
    </VoluntaryLiquidationMachineCtx.Provider>
  )
})

const VoluntaryLiquidationContent = memo(({ onDone }: { onDone?: () => void }) => {
  const isDone = VoluntaryLiquidationMachineCtx.useSelector(s => s.status === 'done')

  useEffect(() => {
    if (isDone && onDone) onDone()
  }, [isDone, onDone])

  if (isDone) return null

  return <VoluntaryLiquidationConfirm />
})
