import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  IconButton,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  useColorModeValue
} from '@chakra-ui/react'
import { chainAdapters } from '@shapeshiftoss/types'
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

import { SendInput } from '../Form'
import { useSendFees } from '../hooks/useSendFees/useSendFees'
import { SendRoutes } from '../Send'
import { TxFeeRadioGroup } from '../TxFeeRadioGroup'

export type FeePrice = {
  [key in chainAdapters.FeeDataKey]: {
    fiatFee: string
    txFee: string
  }
}

export const Confirm = () => {
  const {
    control,
    formState: { isSubmitting }
  } = useFormContext<SendInput>()
  const history = useHistory()
  const translate = useTranslate()
  const { ensName, address, asset, cryptoAmount, cryptoSymbol, fiatAmount, feeType } = useWatch({
    control
  })
  const { fees } = useSendFees()

  const amountWithFees = useMemo(() => {
    const { fiatFee } = fees ? fees[feeType as chainAdapters.FeeDataKey] : { fiatFee: 0 }
    return bnOrZero(fiatAmount).plus(fiatFee).toString()
  }, [fiatAmount, fees, feeType])

  const borderColor = useColorModeValue('gray.100', 'gray.750')

  if (!(address && asset?.name && cryptoSymbol && cryptoAmount && fiatAmount && feeType))
    return null

  return (
    <SlideTransition>
      <IconButton
        variant='ghost'
        icon={<ArrowBackIcon />}
        aria-label={translate('common.back')}
        position='absolute'
        top={2}
        left={3}
        fontSize='xl'
        size='sm'
        isRound
        onClick={() => history.push(SendRoutes.Details)}
      />
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
            symbol={cryptoSymbol}
            value={cryptoAmount}
          />
          <Amount.Fiat color='gray.500' fontSize='xl' lineHeight='short' value={fiatAmount} />
        </Flex>
        <Stack spacing={4} mb={4}>
          <Row>
            <Row.Label>
              <Text translation={'modals.send.confirm.sendTo'} />
            </Row.Label>
            <Row.Value>
              <MiddleEllipsis address={ensName || address} />
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
        </Stack>
      </ModalBody>
      <ModalFooter flexDir='column' borderTopWidth={1} borderColor={borderColor}>
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
                maximumFractionDigits={6}
                symbol={cryptoSymbol}
                value={cryptoAmount}
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
