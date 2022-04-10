import { Box, BoxProps, Button, ButtonGroup, Radio } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { chainAdapters } from '@shapeshiftoss/types'
import { useController, useFormContext, useWatch } from 'react-hook-form'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'

type FeePrice = {
  [key in chainAdapters.FeeDataKey]: {
    fiatFee: string
    txFee: string
  }
}

type TxFeeRadioGroupProps = {
  fees: FeePrice | null
  asset: Asset
}

export enum ConfirmFormFields {
  FeeType = 'feeType',
}

export type ConfirmFormInput = {
  [ConfirmFormFields.FeeType]: chainAdapters.FeeDataKey
}

function getFeeColor(key: chainAdapters.FeeDataKey): string {
  switch (key) {
    case chainAdapters.FeeDataKey.Slow:
      return 'yellow'
    case chainAdapters.FeeDataKey.Fast:
      return 'green'
    case chainAdapters.FeeDataKey.Average:
    default:
      return 'blue'
  }
}

function getFeeTranslation(key: chainAdapters.FeeDataKey): string {
  switch (key) {
    case chainAdapters.FeeDataKey.Slow:
      return 'modals.stake.txFees.low'
    case chainAdapters.FeeDataKey.Fast:
      return 'modals.stake.txFees.high'
    case chainAdapters.FeeDataKey.Average:
    default:
      return 'modals.stake.txFees.medium'
  }
}

const feesOrder: chainAdapters.FeeDataKey[] = [
  chainAdapters.FeeDataKey.Slow,
  chainAdapters.FeeDataKey.Average,
  chainAdapters.FeeDataKey.Fast,
]

export const TxFeeRadioGroup = ({
  fees,
  asset,
  ...styleProps
}: TxFeeRadioGroupProps & BoxProps) => {
  const { control } = useFormContext<ConfirmFormInput>()
  const { field } = useController({
    name: ConfirmFormFields.FeeType,
    control,
    rules: { required: true },
    defaultValue: chainAdapters.FeeDataKey.Average,
  })
  const activeFee = useWatch<ConfirmFormInput, ConfirmFormFields.FeeType>({
    name: ConfirmFormFields.FeeType,
  })

  // TODO: Uncomment when wired up
  if (!fees) {
    return null
    // return (
    // <Box
    // display='flex'
    // flexDir='column'
    // alignItems='center'
    // justifyContent='center'
    // py={2}
    // width='full'
    // height='auto'
    // >
    // <Spinner />
    // </Box>
    // )
  }

  return (
    <ButtonGroup
      variant='ghost-filled'
      width='full'
      borderRadius='xl'
      p={0}
      id='tx-fee'
      {...styleProps}
    >
      {feesOrder.map((key: chainAdapters.FeeDataKey) => {
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
            p={2}
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
              symbol={asset.symbol}
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
