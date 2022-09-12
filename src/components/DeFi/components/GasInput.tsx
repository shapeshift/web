import {
  Box,
  Divider,
  FormControl,
  HStack, NumberInput,
  NumberInputField,
  Radio,
  RadioGroup, SimpleGrid, ThemeTypings, useColorModeValue,
  VStack
} from '@chakra-ui/react'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { getFeeTranslation } from 'components/Modals/Send/TxFeeRadioGroup'
import { RawText, Text } from 'components/Text'
import { FC, Fragment, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

type GasInputProps = {
  value: FeeDataKey | undefined;
  onChange(type: FeeDataKey): void
}

type GasOption = {
  value: FeeDataKey;
  label: string
  duration: string
  amount: string
  color: ThemeTypings['colorSchemes']
}

export const GasInput: FC<GasInputProps> = ({value, onChange}) => {
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const bgColor = useColorModeValue('white', 'gray.850')
  const translate = useTranslate()

  const options = useMemo((): GasOption[] => [
    { value: FeeDataKey.Slow, label: translate(getFeeTranslation(FeeDataKey.Slow)), duration: '~ 10 mins', amount: '10 Gwei', color: 'green.200' },
    { value: FeeDataKey.Average, label: translate(getFeeTranslation(FeeDataKey.Average)), duration: '~ 3 mins', amount: '20 Gwei', color: 'blue.200' },
    { value: FeeDataKey.Fast, label: translate(getFeeTranslation(FeeDataKey.Fast)), duration: '~ 3 seconds', amount: '30 Gwei', color: 'red.400' },
  ], [translate]);
  const selectedOption = useMemo(() => options.find((option) => option.value === value), [options, value])

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
          <Text
            color='gray.500'
            fontWeight='medium'
            translation='gasInput.gasPrice.label'
          />
        </HelperTooltip>
        {!!selectedOption && <RawText fontWeight='medium'>{selectedOption.label} ({selectedOption.amount})</RawText>}
      </HStack>

      <Box borderWidth={1} borderRadius='lg' borderColor={borderColor}>
        <RadioGroup alignItems='stretch' value={value} onChange={onChange}>
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
                      <RawText color='gray.500' flex={1}>
                        {option.duration}
                      </RawText>
                    </HStack>
                  </Radio>
                  <RawText color={option.color}>{option.amount}</RawText>
                </HStack>
                <Divider />
              </Fragment>
            ))}
            <Box px={4} py={2} width='full'>
              <HStack width='full'>
                <Radio color='blue'>
                  <Text translation="gasInput.custom" />
                </Radio>
              </HStack>
              <SimpleGrid mt={2} spacing={4} templateColumns={{ base: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' }}>
                <Box>
                  <HelperTooltip label={translate('gasInput.base.tooltip')}>
                    <Text translation="gasInput.base.label" color='gray.500' fontWeight='medium' />
                  </HelperTooltip>
                  <NumberInput borderColor={borderColor} mt={2}>
                    <NumberInputField placeholder='Number...' />
                  </NumberInput>
                </Box>
                <Box>
                  <HelperTooltip label={translate('gasInput.priority.tooltip')}>
                    <Text translation="gasInput.priority.label" color='gray.500' fontWeight='medium' />
                  </HelperTooltip>
                  <NumberInput borderColor={borderColor} mt={2}>
                  <NumberInputField placeholder='Number...' />
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
