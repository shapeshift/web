import {
  Box,
  Button,
  Flex,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  useColorModeValue
} from '@chakra-ui/react'
import { useFormContext } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import { HelperToolTip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'

export const Confirm = () => {
  const history = useHistory()
  const { getValues } = useFormContext()

  return (
    <SlideTransition>
      <ModalHeader textAlign='center'>
        <Text translation={'modals.send.confirm.send'} />
      </ModalHeader>
      <ModalBody>
        <Flex flexDir='column' alignItems='center' mb={8}>
          <RawText fontSize='4xl' fontWeight='bold' lineHeight='shorter'>
            0.004 BTC
          </RawText>
          <RawText color='gray.500' fontSize='xl' lineHeight='short'>
            $100.25
          </RawText>
        </Flex>
        <Stack spacing={4} mb={4}>
          <Row>
            <Row.Label>
              <Text translation={['modals.send.confirm.sendAssetTo', { asset: 'Bitcoin' }]} />
            </Row.Label>
            <Row.Value>
              <RawText>bc1qxjmc...s9754len</RawText>
            </Row.Value>
          </Row>
          <Row>
            <Row.Label>
              <Text translation={'modals.send.confirm.transactionFee'} />
              <HelperToolTip label='This is the TX fee' flexProps={{ color: 'blue.500' }}>
                <Text translation={['modals.send.confirm.fees', { feeType: getValues('fee') }]} />
              </HelperToolTip>
            </Row.Label>
            <Row.Value>
              <RawText>$10.00</RawText>
            </Row.Value>
          </Row>
          <Button width='full' onClick={() => history.push('/send/details')}>
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
              <RawText>0.004 BTC</RawText>
            </Row.Value>
            <Row.Label>
              <RawText>$110.00</RawText>
            </Row.Label>
          </Box>
        </Row>
        <Button colorScheme='blue' size='lg' width='full' mt={6} type='submit'>
          <Text translation='common.confirm' />
        </Button>
      </ModalFooter>
    </SlideTransition>
  )
}
