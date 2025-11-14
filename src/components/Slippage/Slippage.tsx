import { Button, ButtonGroup, Input, useColorModeValue } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

export const CUSTOM = 'Custom'
export const SLIPPAGE_RATES = ['0.1', '0.5', '1', '3', CUSTOM]

type SlippageProps = {
  onChange(slippage: string): void
  value: string
}

export const Slippage = ({ onChange, value }: SlippageProps) => {
  const translate = useTranslate()
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    [onChange],
  )
  return (
    <ButtonGroup
      bg={useColorModeValue('gray.50', 'gray.850')}
      borderWidth={1}
      borderColor={useColorModeValue('gray.100', 'gray.700')}
      borderRadius='xl'
      px={2}
      py={2}
      display='flex'
    >
      {SLIPPAGE_RATES.map((rate, idx) =>
        rate === CUSTOM ? (
          <Input
            key={idx}
            placeholder={translate('gasInput.custom')}
            colorScheme='blue'
            variant='filled'
            flex={2}
            textAlign='center'
            onChange={handleChange}
          />
        ) : (
          <Button
            key={idx}
            variant='ghost'
            flex={1}
            isActive={value === rate}
            // we need to pass an arg here, so we need an anonymous function wrapper
            onClick={() => onChange(rate)}
          >{`${rate}%`}</Button>
        ),
      )}
    </ButtonGroup>
  )
}
