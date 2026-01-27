import { Input } from '@chakra-ui/react'
import type { ChangeEvent } from 'react'
import { memo, useMemo } from 'react'

const INPUT_LENGTH_BREAKPOINTS = {
  FOR_XS_FONT: 22,
  FOR_SM_FONT: 14,
  FOR_MD_FONT: 10,
} as const

const getInputFontSize = (length: number): string => {
  if (length >= INPUT_LENGTH_BREAKPOINTS.FOR_XS_FONT) return '24px'
  if (length >= INPUT_LENGTH_BREAKPOINTS.FOR_SM_FONT) return '30px'
  if (length >= INPUT_LENGTH_BREAKPOINTS.FOR_MD_FONT) return '38px'
  return '48px'
}

export type CryptoAmountInputProps = {
  value?: string
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  [key: string]: unknown
}

export const CryptoAmountInput = memo((props: CryptoAmountInputProps) => {
  const valueLength = useMemo(() => (props.value ? String(props.value).length : 0), [props.value])
  const fontSize = useMemo(() => getInputFontSize(valueLength), [valueLength])

  return (
    <Input
      size='lg'
      fontSize={fontSize}
      lineHeight={fontSize}
      fontWeight='medium'
      textAlign='center'
      border='none'
      borderRadius='lg'
      bg='transparent'
      variant='unstyled'
      color={props.value ? 'text.base' : 'text.subtle'}
      {...props}
    />
  )
})
