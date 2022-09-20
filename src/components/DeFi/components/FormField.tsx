import type { StackProps } from '@chakra-ui/react'
import { Stack } from '@chakra-ui/react'
import { RawText } from 'components/Text'

export type FormFieldProps = {
  label: string
} & StackProps

export const FormField: React.FC<FormFieldProps> = ({ label, children, ...rest }) => {
  return (
    <Stack spacing={2} {...rest}>
      <RawText fontWeight='medium'>{label}</RawText>
      <Stack spacing={6}>{children}</Stack>
    </Stack>
  )
}
