import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  useColorModeValue
} from '@chakra-ui/react'
import { FeeDataKey, FeeDataType } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { useSendFees } from '../hooks/useSendFees/useSendFees'
import { SendRoutes } from '../Send'
import { TxFeeRadioGroup } from '../TxFeeRadioGroup'

export type FeePrice = {
  [key in FeeDataKey]: {
    fee: string
    amount: string
  } & FeeDataType
}

export const Confirm = () => {
  const {
    control,
    formState: { isSubmitting }
  } = useFormContext()
  const history = useHistory()
  const translate = useTranslate()
  const { address, asset, crypto, fiat, feeType } = useWatch({ control })
  const { fees } = useSendFees()

  const amountWithFees = useMemo(() => {
    const { amount } = fees ? fees[feeType as FeeDataKey] : { amount: 0 }
    return bnOrZero(fiat.amount).plus(amount).toString()
  }, [fiat.amount, fees, feeType])

  return (
    <SlideTransition>
      <ModalHeader textAlign='center'>
        <Text translation={['modals.send.confirm.sendAsset', { asset: asset.name }]} />
      </ModalHeader>
      <ModalBody>
        <Flex flexDir='column' alignItems='center' mb={8}>
          <Amount.Crypto
            fontSize='4xl'
            fontWeight='bold'
            lineHeight='shorter'
            textTransform='uppercase'
            symbol={crypto.symbol}
            value={crypto.amount}
          />
          <Amount.Fiat color='gray.500' fontSize='xl' lineHeight='short' value={fiat.amount} />
        </Flex>
        <Stack spacing={4} mb={4}>
          <Row>
            <Row.Label>
              <Text translation={'modals.send.confirm.sendTo'} />
            </Row.Label>
            <Row.Value>
              <MiddleEllipsis maxWidth='260px'>{address}</MiddleEllipsis>
            </Row.Value>
          </Row>
          <FormControl mt={4}>
            <Row variant='vertical'>
              <Row.Label>
                <FormLabel color='gray.500' htmlFor='tx-fee'>
                  {translate('modals.send.sendForm.transactionFee')}
                </FormLabel>
              </Row.Label>
              <TxFeeRadioGroup fees={fees} />
            </Row>
          </FormControl>
          <Button width='full' onClick={() => history.push(SendRoutes.Details)}>
            <Text translation={'modals.send.confirm.edit'} />
          </Button>
        </Stack>
      </ModalBody>
      <ModalFooter
        flexDir='column'
        borderTopWidth={1}
        borderColor={useColorModeValue('gray.100', 'gray.750')}
      >
        <Row>
          <Box>
            <Row.Label color='inherit' fontWeight='bold'>
              <Text translation='modals.send.confirm.total' />
            </Row.Label>
            <Row.Label flexDir='row' display='flex'>
              <Text translation='modals.send.confirm.amount' />
              <RawText mx={1}>+</RawText>
              <Text translation='modals.send.confirm.transactionFee' />
            </Row.Label>
          </Box>
          <Box textAlign='right'>
            <Row.Value>
              <Amount.Crypto
                textTransform='uppercase'
                maximumFractionDigits={4}
                symbol={crypto.symbol}
                value={crypto.amount}
              />
            </Row.Value>
            <Row.Label>
              <Amount.Fiat value={amountWithFees} />
            </Row.Label>
          </Box>
        </Row>
        <Button
          colorScheme='blue'
          disabled={!fees || isSubmitting}
          isLoading={isSubmitting}
          loadingText={translate('modals.send.broadcastingTransaction')}
          size='lg'
          mt={6}
          type='submit'
          width='full'
        >
          <Text translation='common.confirm' />
        </Button>
      </ModalFooter>
    </SlideTransition>
  )
}
