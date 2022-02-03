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
      <ModalBody>
        <AssetToAsset {...rest} />
        <Divider my={4} />
        {children}
      </ModalBody>
      <ModalFooter flexDir='column' textAlign='center' mt={6}>
        <Stack width='full'>
          {onContinue && (
            <Button size='lg' colorScheme='blue' onClick={onContinue}>
              {translate(continueText)}
            </Button>
          )}
          <Button size='lg' variant='ghost' onClick={onClose}>
            {translate(closeText)}
          </Button>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
