import {
  Button,
  ButtonGroup,
  useId,
  useRadio,
  useRadioGroup,
  UseRadioProps
} from '@chakra-ui/react'
import { HistoryTimeframe } from '@shapeshiftoss/market-service'
import { memo } from 'react'
import { Text } from 'components/Text'

interface RadioCardProps extends UseRadioProps {
  label: string
}

const RadioCard = memo((props: RadioCardProps) => {
  const id = useId(props.id)
  const { getInputProps, getCheckboxProps } = useRadio({ id, ...props })
  const input = getInputProps()
  const checkbox = getCheckboxProps()
  return (
    <>
      <Button aria-label={props.label} as='label' htmlFor={input.id} cursor='pointer' {...checkbox}>
        <Text translation={props.label} />
      </Button>
      <input {...input} />
    </>
  )
})

export interface RadioProps<T> {
  name?: string
  defaultValue?: T
  options: { label: string; value: T }[]
  onChange: (value: T) => void
  variant?: string
  colorScheme?: string
}

type RadioTypes = string | HistoryTimeframe

export const Radio = <T extends RadioTypes>({
  name,
  options,
  onChange,
  defaultValue,
  variant = 'ghost',
  colorScheme = 'blue'
}: RadioProps<T>) => {
  const { getRootProps, getRadioProps } = useRadioGroup({
    name: name ?? 'radio',
    defaultValue: defaultValue ?? options[0]?.value,
    onChange
  })

  const group = getRootProps()

  return (
    <ButtonGroup {...group} variant={variant} colorScheme={colorScheme} size='sm'>
      {options.map(option => {
        return (
          <RadioCard
            {...getRadioProps({ value: option.value })}
            key={option.value}
            label={option.label}
          />
        )
      })}
    </ButtonGroup>
  )
}
