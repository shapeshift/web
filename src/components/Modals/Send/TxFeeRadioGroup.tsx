import { Box, Button, ButtonGroup, Radio, useColorModeValue } from '@chakra-ui/react'
import { RawText, Text } from 'components/Text'
import { useController, useFormContext, useWatch } from 'react-hook-form'

// @TODO: Read from state
const fees = [
  {
    name: 'Slow',
    translation: 'modals.send.sendForm.slow',
    amount: '24 sat/byte',
    fiat: '$1.32',
    color: 'yellow'
  },
  {
    name: 'Average',
    translation: 'modals.send.sendForm.average',
    amount: '80 sat/byte',
    fiat: '$1.49',
    color: 'blue'
  },
  {
    name: 'Fast',
    translation: 'modals.send.sendForm.fast',
    amount: '115 sat/byte',
    fiat: '$1.76',
    color: 'green'
  }
]

export const TxFeeRadioGroup = () => {
  const { control } = useFormContext()
  const { field } = useController({
    name: 'fee',
    control,
    rules: { required: true },
    defaultValue: 'Average'
  })
  const activeFee = useWatch({ name: 'fee' })

  return (
    <ButtonGroup
      variant='ghost-filled'
      width='full'
      bg={useColorModeValue('gray.50', 'gray.850')}
      borderWidth={1}
      borderColor={useColorModeValue('gray.100', 'gray.750')}
      borderRadius='xl'
      p={2}
      id='tx-fee'
    >
      {fees.map((fee, index) => (
        <Button
          display='flex'
          flexDir='column'
          textAlign='left'
          alignItems='flex-start'
          key={`fee-${index}`}
          py={2}
          width='full'
          height='auto'
          onClick={() => field.onChange(fee.name)}
          isActive={activeFee === fee.name}
        >
          <Box fontSize='sm' mb={2} display='flex' alignItems='center'>
            <Radio
              colorScheme={fee.color}
              id={fee.name}
              isChecked={activeFee === fee.name}
              mr={2}
              value={fee.name}
            />
            <Text translation={fee.translation} />
          </Box>
          <RawText fontSize='sm' fontWeight='normal'>
            {fee.amount}
          </RawText>
          <RawText fontSize='sm' fontWeight='normal' color='gray.500'>
            {fee.fiat}
          </RawText>
        </Button>
      ))}
    </ButtonGroup>
  )
}
