import {
  Box,
  Button,
  Divider,
  Link,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  Tag
} from '@chakra-ui/react'
import React from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetToAsset, AssetToAssetProps } from 'components/AssetToAsset/AssetToAsset'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

type Status =
  | 'modals.broadcast.header.pending'
  | 'modals.broadcast.header.success'
  | 'modals.broadcast.header.error'

type BroadcastTxProps = {
  loading?: boolean
  apr?: string
  provider: string
  onClose(): void
  onContinue?(): void
  statusText: Status
  statusIcon: React.ReactNode
  txid: string
  explorerLink: string
} & AssetToAssetProps

export const BroadcastTx = ({
  onClose,
  onContinue,
  provider,
  apr,
  txid,
  statusText,
  explorerLink,
  ...rest
}: BroadcastTxProps) => {
  const translate = useTranslate()
  return (
    <SlideTransition>
      <ModalHeader textAlign='center'>{translate(statusText)}</ModalHeader>
      <ModalBody>
        <AssetToAsset {...rest} />
        <Divider my={4} />
        <Stack spacing={6}>
          <Row>
            <Row.Label>
              <Text translation='modals.broadcast.transactionId' />
            </Row.Label>
            <Row.Value fontWeight='bold'>
              <Link isExternal href={explorerLink} color='blue.500'>
                <MiddleEllipsis maxWidth='200px'>{txid}</MiddleEllipsis>
              </Link>
            </Row.Value>
          </Row>
          <Row>
            <Row.Label>
              <Text translation='modals.broadcast.depositTo' />
            </Row.Label>
            <Row.Value fontWeight='bold'>{provider}</Row.Value>
          </Row>
          {apr && (
            <Row>
              <Row.Label>
                <Text translation='modals.broadcast.averageApr' />
              </Row.Label>
              <Row.Value>
                <Tag colorScheme='green'>{apr}</Tag>
              </Row.Value>
            </Row>
          )}
          <Row>
            <Row.Label>
              <Text translation='modals.broadcast.estimatedReturns' />
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
              <Text translation='modals.broadcast.estimatedGas' />
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
          {onContinue && (
            <Button size='lg' colorScheme='blue' onClick={onContinue}>
              {translate('modals.broadcast.continue')}
            </Button>
          )}
          <Button size='lg' variant='ghost' onClick={onClose}>
            {translate('modals.broadcast.close')}
          </Button>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
