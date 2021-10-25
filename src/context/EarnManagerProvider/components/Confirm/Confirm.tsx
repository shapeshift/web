import { Button } from '@chakra-ui/button'
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

export const Confirm = ({ onConfirm }: ConfirmProps) => {
  return (
    <>
      <div>Confirm</div>
      <Button onClick={onConfirm}>Next</Button>
    </>
  )
}
