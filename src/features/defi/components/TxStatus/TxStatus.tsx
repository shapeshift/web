import { Button, Divider, ModalBody, ModalFooter, ModalHeader, Stack } from '@chakra-ui/react'
import React from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetToAsset, AssetToAssetProps } from 'components/AssetToAsset/AssetToAsset'
import { SlideTransition } from 'components/SlideTransition'

type Status =
  | 'modals.status.header.pending'
  | 'modals.status.header.success'
  | 'modals.status.header.failed'

type TxStatusProps = {
  loading?: boolean
  onClose(): void
  onContinue?(): void
  statusText: Status
  statusIcon: React.ReactNode
  continueText: string
  closeText: string
  children?: React.ReactNode
} & AssetToAssetProps

export const TxStatus = ({
  onClose,
  onContinue,
  statusText,
  continueText,
  closeText,
  children,
  ...rest
}: TxStatusProps) => {
  const translate = useTranslate()
  return (
    <SlideTransition>
      <ModalHeader textAlign='center'>{translate(statusText)}</ModalHeader>
      <ModalBody display='flex' py={6} flexDir={{ base: 'column', md: 'row' }}>
        <Stack width='full' spacing={4} divider={<Divider />}>
          <AssetToAsset {...rest} />
          {children}
        </Stack>
      </ModalBody>
      <ModalFooter flexDir='column' textAlign='center'>
        <Stack width='full'>
          {onContinue && (
            <Button
              size='lg'
              colorScheme='blue'
              data-test='defi-modal-status-continue'
              onClick={onContinue}
            >
              {translate(continueText)}
            </Button>
          )}
          <Button size='lg' variant='ghost' data-test='defi-modal-status-close' onClick={onClose}>
            {translate(closeText)}
          </Button>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
