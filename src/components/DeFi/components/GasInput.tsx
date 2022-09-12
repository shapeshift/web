import {
  Box,
  Divider,
  FormControl,
  HStack, NumberInput,
  Radio,
  RadioGroup, SimpleGrid, ThemeTypings, useColorModeValue,
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
  // TODO: translate
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
            fontWeight='medium'
            translation='gasInput.gasPrice.tooltip'
          />
        </HelperTooltip>
        <Text fontWeight='medium' translation='gasInput.gasPrice.label' />
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
                  <Radio color='blue'>
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
            <HStack width='full'>
              <Radio color='blue'>
                <Text translation="gasInput.custom" />
              </Radio>
            </HStack>
            <SimpleGrid
              templateColumns={{base: '1fr repeat(1, 1fr)',
                md: '1fr repeat(2, 1fr)',
              }}
            >
              <Box>
                <HelperTooltip label={translate('gasInput.base.tooltip')}>
                  <Text mb='8px' translation="gasInput.base.label" />
                </HelperTooltip>
                <NumberInput placeholder='Number...' />
              </Box>
              <Box>
                <HelperTooltip label={translate('gasInput.priority.tooltip')}>
                  <Text mb='8px' translation="gasInput.priority.label" />
                </HelperTooltip>
                <NumberInput placeholder='Number...' />
              </Box>
            </SimpleGrid>


          </VStack>
        </RadioGroup>
      </Box>
    </FormControl>
  )
}
