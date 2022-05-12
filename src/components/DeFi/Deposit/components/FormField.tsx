import { Stack, StackProps } from '@chakra-ui/react'
import { RawText } from 'components/Text'

type FormFieldProps = {
  label: string
} & StackProps

export const FormField: React.FC<FormFieldProps> = ({ label, children, ...rest }) => {
  return (
    <Stack spacing={2} {...rest}>
      <RawText>{label}</RawText>
      {children}
    </Stack>
  )
}
