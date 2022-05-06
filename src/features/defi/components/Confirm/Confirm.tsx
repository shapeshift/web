import { Button } from '@chakra-ui/button'
import { Flex, Stack } from '@chakra-ui/layout'
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
  prefooter?: React.ReactNode
  loading: boolean
  loadingText?: string
  children?: React.ReactNode
} & AssetToAssetProps

export const Confirm = ({
  onConfirm,
  onCancel,
  children,
  prefooter,
  loading,
  loadingText,
  headerText,
  ...rest
}: ConfirmProps) => {
  const translate = useTranslate()
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
              onClick={onConfirm}
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
