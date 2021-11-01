import { Button } from '@chakra-ui/button'
import { Box, Stack } from '@chakra-ui/layout'
import { ModalBody, ModalFooter, ModalHeader } from '@chakra-ui/modal'
import { Divider } from '@chakra-ui/react'
import { Tag } from '@chakra-ui/tag'
import React from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetToAsset, AssetToAssetProps } from 'components/AssetToAsset/AssetToAsset'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

type ConfirmProps = {
  apr: string
  provider: string
  onCancel(): void
  onConfirm(): Promise<void>
  prefooter?: React.ReactNode
} & AssetToAssetProps

export const Confirm = ({ onConfirm, onCancel, apr, provider, ...rest }: ConfirmProps) => {
  const translate = useTranslate()
  return (
    <SlideTransition>
      <ModalHeader textAlign='center'>{translate('modals.confirm.header')}</ModalHeader>
      <ModalBody>
        <AssetToAsset {...rest} />
        <Divider my={4} />
        <Stack spacing={6}>
          <Row>
            <Row.Label>
              <Text translation='modals.confirm.depositTo' />
            </Row.Label>
            <Row.Value fontWeight='bold'>{provider}</Row.Value>
          </Row>
          <Row>
            <Row.Label>
              <Text translation='modals.confirm.averageApr' />
            </Row.Label>
            <Row.Value>
              <Tag colorScheme='green'>{apr}</Tag>
            </Row.Value>
          </Row>
          <Row>
            <Row.Label>
              <Text translation='modals.confirm.estimatedReturns' />
            </Row.Label>
            <Row.Value>
              <Box textAlign='right'>
                <Amount.Fiat fontWeight='bold' value='529.04' />
                <Amount.Crypto color='gray.500' value='529.04' symbol='USDC' />
              </Box>
            </Row.Value>
          </Row>
          <Row>
            <Row.Label>
              <Text translation='modals.confirm.estimatedGas' />
            </Row.Label>
            <Row.Value>
              <Box textAlign='right'>
                <Amount.Fiat fontWeight='bold' value='30.00' />
                <Amount.Crypto color='gray.500' value='0.024' symbol='ETH' />
              </Box>
            </Row.Value>
          </Row>
        </Stack>
      </ModalBody>
      <ModalFooter flexDir='column' textAlign='center' mt={6}>
        <Stack width='full'>
          <Text color='gray.500' translation='modals.confirm.preFooter' />
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
