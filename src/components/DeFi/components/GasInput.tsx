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
import type { WalletConnectFeeDataKey } from 'plugins/walletConnectToDapps/components/modal/SignMessageConfirmation'
import { Fragment, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { getFeeTranslation } from 'components/Modals/Send/TxFeeRadioGroup'
import { RawText, Text } from 'components/Text'

type GasInputProps = {
  value: WalletConnectFeeDataKey
  onChange(type: WalletConnectFeeDataKey): void
}

type BasicGasOption = {
  value: FeeDataKey
  label: string
  duration: string
  amount: string
  color: ThemeTypings['colorSchemes']
}

export const GasInput: React.FC<GasInputProps> = ({ value, onChange }) => {
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const bgColor = useColorModeValue('white', 'gray.850')
  const translate = useTranslate()

  const options = useMemo(
    (): BasicGasOption[] => [
      {
        value: FeeDataKey.Slow,
        label: translate(getFeeTranslation(FeeDataKey.Slow)),
        duration: translate('gasInput.duration.slow'),
        amount: '10 Gwei',
        color: 'green.200',
      },
      {
        value: FeeDataKey.Average,
        label: translate(getFeeTranslation(FeeDataKey.Average)),
        duration: translate('gasInput.duration.average'),
        amount: '20 Gwei',
        color: 'blue.200',
      },
      {
        value: FeeDataKey.Fast,
        label: translate(getFeeTranslation(FeeDataKey.Fast)),
        duration: translate('gasInput.duration.fast'),
        amount: '30 Gwei',
        color: 'red.400',
      },
    ],
    [translate],
  )

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
          <Text color='gray.500' fontWeight='medium' translation='gasInput.gasPrice.label' />
        </HelperTooltip>
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
                <Radio color='blue' value={'custom'}>
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
                    <Text translation='gasInput.base.label' color='gray.500' fontWeight='medium' />
                  </HelperTooltip>
                  <NumberInput borderColor={borderColor} mt={2}>
                    <NumberInputField placeholder='0 gwei' />
                  </NumberInput>
                </Box>
                <Box>
                  <HelperTooltip label={translate('gasInput.priority.tooltip')}>
                    <Text
                      translation='gasInput.priority.label'
                      color='gray.500'
                      fontWeight='medium'
                    />
                  </HelperTooltip>
                  <NumberInput borderColor={borderColor} mt={2}>
                    <NumberInputField placeholder='0 gwei' />
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
