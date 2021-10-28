import { Button } from '@chakra-ui/button'
import { Box, Stack } from '@chakra-ui/layout'
import { ModalBody, ModalFooter, ModalHeader } from '@chakra-ui/modal'
import { Tag } from '@chakra-ui/tag'
import { Asset } from '@shapeshiftoss/types'
import React from 'react'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'

type ConfirmProps = {
  children: React.ReactNode
  fromAsset: Asset
  toAsset: Asset
  onCancel(): void
  onConfirm(): Promise<void>
  prefooter?: React.ReactNode
}

export const Confirm = ({ onConfirm, onCancel }: ConfirmProps) => {
  return (
    <SlideTransition>
      <ModalHeader>Confirm Deposit</ModalHeader>
      <ModalBody>
        <Stack>
          <Row>
            <Row.Label>Deposit To</Row.Label>
            <Row.Value>Yearn Finance</Row.Value>
          </Row>
          <Row>
            <Row.Label>Average APR</Row.Label>
            <Row.Value>
              <Tag colorScheme='green'>4%</Tag>
            </Row.Value>
          </Row>
          <Row>
            <Row.Label>Estimated Yearly Rewards</Row.Label>
            <Row.Value>
              <Box textAlign='right'>
                <Amount.Fiat value='529.04' />
                <Amount.Crypto color='gray.500' value='529.04' symbol='USDC' />
              </Box>
            </Row.Value>
          </Row>
          <Row>
            <Row.Label>Estimated Gas Fee</Row.Label>
            <Row.Value>
              <Box textAlign='right'>
                <Amount.Fiat value='30.00' />
                <Amount.Crypto color='gray.500' value='0.024' symbol='ETH' />
              </Box>
            </Row.Value>
          </Row>
        </Stack>
      </ModalBody>
      <ModalFooter flexDir='column' borderTopWidth={1} borderColor='gray.750' textAlign='center'>
        <Stack>
          <RawText color='gray.500'>Rewards acure automatically</RawText>
          <Button size='lg' colorScheme='blue' onClick={onConfirm}>
            Sign & Broadcast
          </Button>
          <Button size='lg' variant='ghost' onClick={onCancel}>
            Cancel
          </Button>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
