import { Button } from '@chakra-ui/button'
import { Stack } from '@chakra-ui/layout'
import type { StackProps } from '@chakra-ui/react'
import React from 'react'
import { useTranslate } from 'react-polyglot'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

type ConfirmProps = {
  onCancel(): void
  onConfirm(): Promise<void>
  headerText: string
  prefooter?: React.ReactNode
  isDisabled: boolean
  loading: boolean
  loadingText?: string
  children?: React.ReactNode
} & StackProps

export const Confirm = ({
  onConfirm,
  onCancel,
  children,
  prefooter,
  isDisabled,
  loading,
  loadingText,
  headerText,
  ...rest
}: ConfirmProps) => {
  const translate = useTranslate()

  const {
    state: { isConnected },
    dispatch,
  } = useWallet()

  const handleWalletModalOpen = () => {
    /**
     * call onCancel to close the current modal
     * before opening the connect wallet modal.
     */
    onCancel()
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }

  return (
    <>
      <Stack width='full' spacing={6} {...rest}>
        {children}
        {prefooter}
        <Stack width='full' direction='row'>
          <Button size='lg' colorScheme='gray' width='full' onClick={onCancel} isDisabled={loading}>
            {translate('modals.confirm.cancel')}
          </Button>
          <Button
            size='lg'
            width='full'
            colorScheme='blue'
            data-test='defi-modal-confirm-button'
            onClick={() => (isConnected ? onConfirm() : handleWalletModalOpen())}
            isDisabled={isDisabled}
            isLoading={loading}
            loadingText={loadingText}
          >
            {translate('modals.confirm.signBroadcast')}
          </Button>
        </Stack>
      </Stack>
    </>
  )
}
