import { Box, Button, ButtonGroup, Radio, Spinner, useColorModeValue } from '@chakra-ui/react'
import { ChainAdapters } from '@shapeshiftoss/types'
import { useController, useFormContext, useWatch } from 'react-hook-form'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'

import { SendFormFields } from './Form'
import { FeePrice } from './views/Confirm'

type TxFeeRadioGroupProps = {
  fees: FeePrice | null
}

function getFeeColor(key: ChainAdapters.FeeDataKey): string {
  switch (key) {
    case ChainAdapters.FeeDataKey.Slow:
      return 'yellow'
    case ChainAdapters.FeeDataKey.Fast:
      return 'green'
    case ChainAdapters.FeeDataKey.Average:
    default:
      return 'blue'
  }
}

function getFeeTranslation(key: ChainAdapters.FeeDataKey): string {
  switch (key) {
    case ChainAdapters.FeeDataKey.Slow:
      return 'modals.send.sendForm.slow'
    case ChainAdapters.FeeDataKey.Fast:
      return 'modals.send.sendForm.fast'
    case ChainAdapters.FeeDataKey.Average:
    default:
      return 'modals.send.sendForm.average'
  }
}

const feesOrder: ChainAdapters.FeeDataKey[] = [
  ChainAdapters.FeeDataKey.Slow,
  ChainAdapters.FeeDataKey.Average,
  ChainAdapters.FeeDataKey.Fast
]

export const TxFeeRadioGroup = ({ fees }: TxFeeRadioGroupProps) => {
  const { control } = useFormContext()
  const { field } = useController({
    name: SendFormFields.FeeType,
    control,
    rules: { required: true },
    defaultValue: ChainAdapters.FeeDataKey.Average
  })
  const [asset, activeFee] = useWatch({ name: [SendFormFields.Asset, SendFormFields.FeeType] })
  const bg = useColorModeValue('gray.50', 'gray.850')
  const borderColor = useColorModeValue('gray.100', 'gray.750')

  if (!fees) {
    return (
      <Box
        display='flex'
        flexDir='column'
        alignItems='center'
        justifyContent='center'
        py={2}
        width='full'
        height='auto'
      >
        <Spinner />
      </Box>
    )
  }

  return (
    <ButtonGroup
      variant='ghost-filled'
      width='full'
      bg={bg}
      borderWidth={1}
      borderColor={borderColor}
      borderRadius='xl'
      p={2}
      id='tx-fee'
    >
      {feesOrder.map((key: ChainAdapters.FeeDataKey) => {
        const current = fees[key]
        const color = getFeeColor(key)
        const translation = getFeeTranslation(key)

        return (
          <Button
            display='flex'
            flexDir='column'
            textAlign='left'
            alignItems='flex-start'
            key={`fee-${key}`}
            py={2}
            width='full'
            height='auto'
            onClick={() => field.onChange(key)}
            isActive={activeFee === key}
          >
            <Box fontSize='sm' mb={2} display='flex' alignItems='center'>
              <Radio
                colorScheme={color}
                id={key}
                isChecked={activeFee === key}
                mr={2}
                value={key}
              />
              <Text translation={translation} />
            </Box>
            <Amount.Crypto
              fontSize='sm'
              fontWeight='normal'
              maximumFractionDigits={4}
              symbol={asset.tokenId ? 'ETH' : asset.symbol}
              value={current.fee}
            />
            <Amount.Fiat
              color='gray.500'
              fontSize='sm'
              fontWeight='normal'
              value={current.amount}
            />
          </Button>
        )
      })}
    </ButtonGroup>
  )
}
