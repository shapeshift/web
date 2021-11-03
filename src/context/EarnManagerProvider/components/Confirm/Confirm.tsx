import { Button } from '@chakra-ui/button'
import { Stack } from '@chakra-ui/layout'
import { ModalBody, ModalFooter, ModalHeader } from '@chakra-ui/modal'
import { Divider } from '@chakra-ui/react'
import React from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetToAsset, AssetToAssetProps } from 'components/AssetToAsset/AssetToAsset'
import { SlideTransition } from 'components/SlideTransition'

type ConfirmProps = {
  onCancel(): void
  onConfirm(): Promise<void>
  prefooter?: React.ReactNode
  children?: React.ReactNode
} & AssetToAssetProps

export const Confirm = ({ onConfirm, onCancel, children, prefooter, ...rest }: ConfirmProps) => {
  const translate = useTranslate()
  return (
    <SlideTransition>
      <ModalHeader textAlign='center'>{translate('modals.confirm.header')}</ModalHeader>
      <ModalBody>
        <AssetToAsset {...rest} />
        <Divider my={4} />
        {children}
      </ModalBody>
      <ModalFooter flexDir='column' textAlign='center' mt={6}>
        <Stack width='full'>
          {prefooter}
          <Button size='lg' colorScheme='blue' onClick={onConfirm}>
            {translate('modals.confirm.signBroadcast')}
          </Button>
          <Button size='lg' variant='ghost' onClick={onCancel}>
            {translate('modals.confirm.cancel')}
          </Button>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
