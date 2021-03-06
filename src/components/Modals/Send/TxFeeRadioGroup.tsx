import { Box, Button, ButtonGroup, Radio, Spinner, useColorModeValue } from '@chakra-ui/react'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { useController, useFormContext, useWatch } from 'react-hook-form'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'
import { selectFeeAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { SendInput } from './Form'
import { SendFormFields } from './SendCommon'
import { FeePrice } from './views/Confirm'

type TxFeeRadioGroupProps = {
  fees: FeePrice | null
}

function getFeeColor(key: FeeDataKey): string {
  switch (key) {
    case FeeDataKey.Slow:
      return 'yellow'
    case FeeDataKey.Fast:
      return 'green'
    case FeeDataKey.Average:
    default:
      return 'blue'
  }
}

function getFeeTranslation(key: FeeDataKey): string {
  switch (key) {
    case FeeDataKey.Slow:
      return 'modals.send.sendForm.slow'
    case FeeDataKey.Fast:
      return 'modals.send.sendForm.fast'
    case FeeDataKey.Average:
    default:
      return 'modals.send.sendForm.average'
  }
}

const feesOrder: FeeDataKey[] = [FeeDataKey.Slow, FeeDataKey.Average, FeeDataKey.Fast]

export const TxFeeRadioGroup = ({ fees }: TxFeeRadioGroupProps) => {
  const { control } = useFormContext<SendInput>()
  const { field } = useController({
    name: SendFormFields.FeeType,
    control,
    rules: { required: true },
    defaultValue: FeeDataKey.Average,
  })
  const asset = useWatch<SendInput, SendFormFields.Asset>({ name: SendFormFields.Asset })
  const activeFee = useWatch<SendInput, SendFormFields.FeeType>({ name: SendFormFields.FeeType })
  const bg = useColorModeValue('gray.50', 'gray.850')
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, asset.assetId))

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
      variant='ghost'
      width='full'
      bg={bg}
      borderWidth={1}
      borderColor={borderColor}
      borderRadius='xl'
      p={2}
      id='tx-fee'
    >
      {feesOrder.map((key: FeeDataKey) => {
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
              maximumFractionDigits={6}
              symbol={feeAsset.symbol}
              value={current.txFee}
            />
            <Amount.Fiat
              color='gray.500'
              fontSize='sm'
              fontWeight='normal'
              value={current.fiatFee}
            />
          </Button>
        )
      })}
    </ButtonGroup>
  )
}
