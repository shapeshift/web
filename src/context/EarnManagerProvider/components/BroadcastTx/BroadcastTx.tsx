import { Asset } from '@shapeshiftoss/types'
import React from 'react'

type Status = 'pending' | 'success' | 'fail'

type BroadcastTxProps = {
  children: React.ReactNode
  fromAsset: Asset
  loading: boolean
  onClose(): void
  onContinue?(): void
  status: Status
  statusText: React.ReactNode
  toAsset: Asset
  txid: string
}

export const BroadcastTx = (_: BroadcastTxProps) => {
  // {status === success && onContinue && (
  //   render button
  // )}
  return <div>BroadcastTx</div>
}
