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
  headerText: string
  leftSide?: React.ReactNode
  prefooter?: React.ReactNode
  children?: React.ReactNode
} & AssetToAssetProps

export const Confirm = ({
  onConfirm,
  onCancel,
  children,
  prefooter,
  headerText,
  leftSide,
  ...rest
}: ConfirmProps) => {
  const translate = useTranslate()
  return (
    <SlideTransition>
      <ModalHeader textAlign='center'>{translate(headerText)}</ModalHeader>
      <ModalBody display='flex' py={6} flexDir={{ base: 'column', md: 'row' }}>
        {leftSide && leftSide}
        <Stack>
          <AssetToAsset {...rest} />
          <Divider my={4} />
          {children}
        </Stack>
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
