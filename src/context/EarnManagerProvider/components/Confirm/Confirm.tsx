import { Asset } from '@shapeshiftoss/types'
import React from 'react'

type ConfirmProps = {
  children: React.ReactNode
  fromAsset: Asset
  toAsset: Asset
  onCancel(): void
  onConfirm(): Promise<void>
  prefooter?: React.ReactNode
}

export const Confirm = (_: ConfirmProps) => {
  return <div>Confirm</div>
}

// Maybe?
// export const Row = () => {}]
// Confirm.Row = Row
