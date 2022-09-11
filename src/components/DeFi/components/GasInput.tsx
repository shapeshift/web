import type { ThemeTypings } from '@chakra-ui/react'
import {
  Box,
  Divider,
  FormControl,
  HStack,
  Radio,
  RadioGroup,
  useColorModeValue,
  VStack
} from '@chakra-ui/react'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { RawText, Text } from 'components/Text'
import type { FC } from 'react'
import { useTranslate } from 'react-polyglot'

type GasInputProps = {
  onChange(base: number, priority: number): void
}

type GasOption = {
  label: string
  duration: string
  color: ThemeTypings['colorSchemes']
}

const DEFAULT_OPTIONS: GasOption[] = [
  { label: 'Slow', duration: '~ 10 mins', color: 'green.200' },
  { label: 'Fast', duration: '~ 3 mins', color: 'blue.200' },
  { label: 'Faster', duration: '~ 3 seconds', color: 'red.400' },
]

export const GasInput: FC<GasInputProps> = () => {
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const bgColor = useColorModeValue('white', 'gray.850')
  const translate = useTranslate()
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
        <HelperTooltip label={translate('gasInput.gasPriceTooltip')}>
          <Text
            color='gray.500'
            fontSize='sm'
            fontWeight='medium'
            translation='gasInput.gasPrice'
          />
        </HelperTooltip>
        <Text fontSize='sm' fontWeight='medium' translation='gasInput.gasPrice' />
      </HStack>

      <Box borderWidth={1} borderRadius='lg' borderColor={borderColor}>
        <RadioGroup name='form-name' alignItems='stretch'>
          <VStack spacing={0}>
            {DEFAULT_OPTIONS.map(option => (
              <>
                <HStack
                  alignItems='center'
                  fontWeight='medium'
                  width='full'
                  justifyContent='space-between'
                  px={4}
                  py={2}
                >
                  <Radio colorScheme='blue'>
                    <HStack>
                      <RawText>{option.label}</RawText>
                      <RawText color='gray.500' flex={1}>
                        {option.duration}
                      </RawText>
                    </HStack>
                  </Radio>
                  <RawText color={option.color}>{'30 Gwei'}</RawText>
                </HStack>
                <Divider />
              </>
            ))}
          </VStack>
        </RadioGroup>
      </Box>
    </FormControl>
  )
}
