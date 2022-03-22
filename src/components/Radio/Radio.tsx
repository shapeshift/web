import {
  Button,
  ButtonGroup,
  ButtonGroupProps,
  useId,
  useRadio,
  useRadioGroup,
  UseRadioProps
} from '@chakra-ui/react'
import { ThemeTypings } from '@chakra-ui/styled-system'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import Polyglot, { InterpolationOptions } from 'node-polyglot'
import { memo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'

interface RadioCardProps extends UseRadioProps {
  label: string | [string, number | Polyglot.InterpolationOptions]
}

const RadioCard = memo((props: RadioCardProps) => {
  const id = useId(props.id)
  const { getInputProps, getCheckboxProps } = useRadio({ id, ...props })
  const input = getInputProps()
  const checkbox = getCheckboxProps()
  const translate: (phrase: string, options?: number | InterpolationOptions) => string =
    useTranslate()
  const ariaLabel = typeof props.label === 'string' ? props.label : translate(...props.label)
  return (
    <>
      <Button aria-label={ariaLabel} as='label' htmlFor={input.id} cursor='pointer' {...checkbox}>
        <Text translation={props.label} />
      </Button>
      <input {...input} />
    </>
  )
})

export interface RadioOption<T> {
  label: string | [string, number | Polyglot.InterpolationOptions]
  value: T
}

export interface RadioProps<T> {
  name?: string
  defaultValue?: T
  options: RadioOption<T>[]
  onChange: (value: T) => void
  variant?: string
  colorScheme?: ThemeTypings['colorSchemes']
  buttonGroupProps?: ButtonGroupProps
}

type RadioTypes = string | HistoryTimeframe

export const Radio = <T extends RadioTypes>({
  name,
  options,
  onChange,
  defaultValue,
  variant = 'ghost',
  colorScheme = 'blue',
  buttonGroupProps
}: RadioProps<T>) => {
  const { getRootProps, getRadioProps } = useRadioGroup({
    name: name ?? 'radio',
    defaultValue,
    onChange
  })

  const group = getRootProps()

  return (
    <ButtonGroup
      {...group}
      variant={variant}
      colorScheme={colorScheme}
      size='sm'
      {...buttonGroupProps}
    >
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
