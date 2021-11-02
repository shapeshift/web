import { Button, ButtonGroup, Input, useColorModeValue } from '@chakra-ui/react'

export const CUSTOM = 'Custom'
export const SLIPPAGE_RATES = ['0.1', '0.5', '1', '3', CUSTOM]

type SlippageProps = {
  onChange(slippage: string): void
  value: string
}

export const Slippage = ({ onChange, value }: SlippageProps) => {
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
            placeholder='Custom'
            colorScheme='blue'
            variant='filled'
            flex={2}
            textAlign='center'
            onChange={e => onChange(e.target.value)}
          />
        ) : (
          <Button
            key={idx}
            variant='ghost'
            flex={1}
            isActive={value === rate}
            onClick={() => onChange(rate)}
          >{`${rate}%`}</Button>
        )
      )}
    </ButtonGroup>
  )
}
