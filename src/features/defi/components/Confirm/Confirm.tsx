import type { StackProps } from '@chakra-ui/react'
import { Button, Stack } from '@chakra-ui/react'
import React, { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

type ConfirmProps = {
  onCancel(): void
  onConfirm(): Promise<void>
  headerText: string
  preFooter?: React.ReactNode
  isDisabled: boolean
  loading: boolean
  loadingText?: string
  children?: React.ReactNode
} & StackProps

export const Confirm = ({
  onConfirm,
  onCancel,
  children,
  preFooter,
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

  const handleWalletModalOpen = useCallback(() => {
    /**
     * call onCancel to close the current modal
     * before opening the connect wallet modal.
     */
    onCancel()
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [dispatch, onCancel])

  const handleClick = useCallback(
    () => (isConnected ? onConfirm() : handleWalletModalOpen()),
    [isConnected, onConfirm, handleWalletModalOpen],
  )

  return (
    <>
      <Stack width='full' spacing={6} {...rest}>
        {children}
        {preFooter}
        <Stack width='full' direction='row'>
          <Button size='lg' colorScheme='gray' width='full' onClick={onCancel} isDisabled={loading}>
            {translate('modals.confirm.cancel')}
          </Button>
          <Button
            size='lg-multiline'
            width='full'
            colorScheme='blue'
            data-test='defi-modal-confirm-button'
            onClick={handleClick}
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
