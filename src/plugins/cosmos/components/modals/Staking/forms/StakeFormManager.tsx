import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import React from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useHistory } from 'react-router'
import { useModal } from 'hooks/useModal/useModal'

import { Field, StakeRoutes, StakingValues } from '../StakingCommon'

type StakeFormManagerRenderProps = {
  isOpen: boolean
  handleCancel: () => void
  handleClose: () => void
}
type StakeFormProps = {
  children: ({ isOpen, handleClose, handleCancel }: StakeFormManagerRenderProps) => React.ReactNode
}

export const StakeFormManager = ({ children }: StakeFormProps) => {
  const history = useHistory()
  const { cosmosStaking } = useModal()
  const { close, isOpen } = cosmosStaking

  const methods = useForm<StakingValues>({
    mode: 'onChange',
    defaultValues: {
      [Field.AmountFieldError]: '',
      [Field.FiatAmount]: '',
      [Field.CryptoAmount]: '',
      [Field.FeeType]: FeeDataKey.Average,
      [Field.GasLimit]: '',
      [Field.TxFee]: '',
      [Field.FiatFee]: '',
    },
  })

  const handleCancel = () => {
    history.goBack()
  }

  const handleClose = () => {
    methods.reset()
    close()
    history.push(StakeRoutes.Overview)
  }

  const checkKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter') event.preventDefault()
  }

  return (
    <FormProvider {...methods}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <form onKeyDown={checkKeyDown}>{children({ handleCancel, handleClose, isOpen })}</form>
    </FormProvider>
  )
}
