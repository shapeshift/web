import { Button } from '@chakra-ui/button'
import { Flex, Stack } from '@chakra-ui/layout'
import { ModalBody, ModalFooter, ModalHeader } from '@chakra-ui/modal'
import { Divider } from '@chakra-ui/react'
import React from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetToAsset, AssetToAssetProps } from 'components/AssetToAsset/AssetToAsset'
import { SlideTransition } from 'components/SlideTransition'
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
} & AssetToAssetProps

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
    <SlideTransition>
      <ModalBody pt={0} flexDir={{ base: 'column', md: 'row' }}>
        <ModalHeader textAlign='center'>{translate(headerText)}</ModalHeader>
        <Stack width='full' spacing={4} divider={<Divider />}>
          <AssetToAsset {...rest} />
          {children}
        </Stack>
      </ModalBody>
      <ModalFooter flexDir='column' textAlign='center' mt={6}>
        <Stack width='full'>
          {prefooter}
          <Flex width='full' justifyContent='space-between'>
            <Button size='lg' colorScheme='gray' onClick={onCancel} isDisabled={loading}>
              {translate('modals.confirm.cancel')}
            </Button>
            <Button
              size='lg'
              colorScheme='blue'
              data-test='defi-modal-confirm-button'
              onClick={() => (isConnected ? onConfirm() : handleWalletModalOpen())}
              isDisabled={isDisabled}
              isLoading={loading}
              loadingText={loadingText}
            >
              {translate('modals.confirm.signBroadcast')}
            </Button>
          </Flex>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
