import type { ResponsiveValue, StackDirection } from '@chakra-ui/react'
import { Box, Button, Radio, Spinner, Stack, useColorModeValue } from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { Property } from 'csstype'
import { useController, useFormContext, useWatch } from 'react-hook-form'

import type { SendInput } from './Form'
import { SendFormFields } from './SendCommon'
import type { FeePrice } from './views/Confirm'

import { Amount } from '@/components/Amount/Amount'
import { Text } from '@/components/Text'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { selectFeeAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type TxFeeRadioGroupProps = {
  fees: FeePrice | null
}

const stackDirectionMdRow: StackDirection = { base: 'column', md: 'row' }
const flexDirMdColumn: ResponsiveValue<Property.FlexDirection> = { base: 'row', md: 'column' }
const alignItemsMdFlexStart = { base: 'center', md: 'flex-start' }
const alignItemsMdFlexStart2 = { base: 'flex-end', md: 'flex-start' }
const marginBottomMb2 = { base: 0, md: 2 }

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

export function getFeeTranslation(key: FeeDataKey): string {
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
  const assetId = useWatch<SendInput, SendFormFields.AssetId>({ name: SendFormFields.AssetId })
  const activeFee = useWatch<SendInput, SendFormFields.FeeType>({ name: SendFormFields.FeeType })
  const bg = useColorModeValue('gray.50', 'gray.850')
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const feeAssetId = getChainAdapterManager().get(fromAssetId(assetId).chainId)?.getFeeAssetId()
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, feeAssetId ?? ''))

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
    <Stack
      width='full'
      direction={stackDirectionMdRow}
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
            flexDir={flexDirMdColumn}
            variant='ghost'
            textAlign='left'
            alignItems={alignItemsMdFlexStart}
            justifyContent='space-between'
            key={`fee-${key}`}
            py={2}
            width='full'
            height='auto'
            // we need to pass an arg here, so we need an anonymous function wrapper
            onClick={() => field.onChange(key)}
            isActive={activeFee === key}
          >
            <Box fontSize='sm' mb={marginBottomMb2} display='flex' alignItems='center'>
              <Radio
                colorScheme={color}
                id={key}
                isChecked={activeFee === key}
                mr={2}
                value={key}
              />
              <Text translation={translation} />
            </Box>
            <Stack spacing={0} alignItems={alignItemsMdFlexStart2}>
              <Amount.Crypto
                fontSize='sm'
                fontWeight='normal'
                maximumFractionDigits={6}
                symbol={feeAsset?.symbol ?? ''}
                value={current.txFee}
              />
              <Amount.Fiat
                color='text.subtle'
                fontSize='sm'
                fontWeight='normal'
                value={current.fiatFee}
              />
            </Stack>
          </Button>
        )
      })}
    </Stack>
  )
}
