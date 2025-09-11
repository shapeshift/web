import type { StackProps } from '@chakra-ui/react'
import { Stack } from '@chakra-ui/react'
import type { JSX } from 'react'

type SharedConfirmFooterProps = StackProps & {
  detail: JSX.Element | null
  button: JSX.Element | null
}

export const SharedConfirmFooter = ({ detail, button, ...props }: SharedConfirmFooterProps) => {
  return (
    <Stack width='full' py={4} {...props}>
      {detail}
      {button}
    </Stack>
  )
}
