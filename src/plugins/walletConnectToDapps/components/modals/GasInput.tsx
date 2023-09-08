import type { ThemeTypings } from '@chakra-ui/react'
import {
  Box,
  Divider,
  FormControl,
  HStack,
  NumberInput,
  NumberInputField,
  Radio,
  RadioGroup,
  SimpleGrid,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { ConfirmData } from 'plugins/walletConnectToDapps/v1/components/modals/callRequest/CallRequestCommon'
import type { FC } from 'react'
import { Fragment, useCallback, useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { getFeeTranslation } from 'components/Modals/Send/TxFeeRadioGroup'
import type { FeePrice } from 'components/Modals/Send/views/Confirm'
import { RawText, Text } from 'components/Text'

type GasInputProps = {
  fees: FeePrice | undefined
}

type GasOption = {
  value: FeeDataKey
  label: string
  duration: string
  gasPriceGwei: string
  color: ThemeTypings['colorSchemes']
}

export const GasInput: FC<GasInputProps> = ({ fees }) => {
  const { control, setValue, register } = useFormContext<ConfirmData>()
  const speed = useWatch({ control, name: 'speed' })

  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const bgColor = useColorModeValue('white', 'gray.850')
  const translate = useTranslate()

  const options = useMemo(
    (): GasOption[] =>
      fees
        ? [
            {
              value: FeeDataKey.Slow,
              label: translate(getFeeTranslation(FeeDataKey.Slow)),
              duration: translate('gasInput.duration.slow'),
              gasPriceGwei: fees.slow.gasPriceGwei ?? '0',
              color: 'green.200',
            },
            {
              value: FeeDataKey.Average,
              label: translate(getFeeTranslation(FeeDataKey.Average)),
              duration: translate('gasInput.duration.average'),
              gasPriceGwei: fees.average.gasPriceGwei ?? '0',
              color: 'blue.200',
            },
            {
              value: FeeDataKey.Fast,
              label: translate(getFeeTranslation(FeeDataKey.Fast)),
              duration: translate('gasInput.duration.fast'),
              gasPriceGwei: fees.fast.gasPriceGwei ?? '0',
              color: 'red.400',
            },
          ]
        : [],
    [translate, fees],
  )
  const selectedOption = useMemo(
    () => options.find(option => option.value === speed),
    [options, speed],
  )

  const handleChange = useCallback((speed: FeeDataKey) => setValue('speed', speed), [setValue])

  return (
    <FormControl
      borderWidth={1}
      borderColor={borderColor}
      bg={bgColor}
      borderRadius='xl'
      px={4}
      pt={2}
      pb={4}
    >
      <HStack justifyContent='space-between' mb={4}>
        <HelperTooltip label={translate('gasInput.gasPrice.tooltip')}>
          <Text color='text.subtle' fontWeight='medium' translation='gasInput.gasPrice.label' />
        </HelperTooltip>
        {!!selectedOption && (
          <RawText fontWeight='medium'>
            {selectedOption.label} - {selectedOption.gasPriceGwei} Gwei
          </RawText>
        )}
      </HStack>

      <Box borderWidth={1} borderRadius='lg' borderColor={borderColor}>
        <RadioGroup alignItems='stretch' value={speed} onChange={handleChange}>
          <VStack spacing={0}>
            {options.map(option => (
              <Fragment key={option.value}>
                <HStack
                  alignItems='center'
                  fontWeight='medium'
                  width='full'
                  justifyContent='space-between'
                  px={4}
                  py={2}
                >
                  <Radio color='blue' value={option.value}>
                    <HStack>
                      <RawText>{option.label}</RawText>
                      <RawText color='text.subtle' flex={1}>
                        {option.duration}
                      </RawText>
                    </HStack>
                  </Radio>
                  <RawText color={option.color}>{`${option.gasPriceGwei} Gwei`}</RawText>
                </HStack>
                <Divider />
              </Fragment>
            ))}
            <Box px={4} py={2} width='full'>
              <HStack width='full'>
                <Radio color='blue' value='custom'>
                  <Text translation='gasInput.custom' />
                </Radio>
              </HStack>
              <SimpleGrid
                mt={2}
                spacing={4}
                templateColumns={{ base: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' }}
              >
                <Box>
                  <HelperTooltip label={translate('gasInput.base.tooltip')}>
                    <Text
                      translation='gasInput.base.label'
                      color='text.subtle'
                      fontWeight='medium'
                    />
                  </HelperTooltip>
                  <NumberInput borderColor={borderColor} mt={2}>
                    <NumberInputField placeholder='0 gwei' {...register('customFee.baseFee')} />
                  </NumberInput>
                </Box>
                <Box>
                  <HelperTooltip label={translate('gasInput.priority.tooltip')}>
                    <Text
                      translation='gasInput.priority.label'
                      color='text.subtle'
                      fontWeight='medium'
                    />
                  </HelperTooltip>
                  <NumberInput borderColor={borderColor} mt={2}>
                    <NumberInputField placeholder='0 gwei' {...register('customFee.priorityFee')} />
                  </NumberInput>
                </Box>
              </SimpleGrid>
            </Box>
          </VStack>
        </RadioGroup>
      </Box>
    </FormControl>
  )
}
