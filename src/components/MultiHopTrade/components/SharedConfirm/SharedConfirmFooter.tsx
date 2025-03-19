import type { StackProps } from '@chakra-ui/react'
import { Stack } from '@chakra-ui/react'

type SharedConfirmFooterProps = StackProps & {
  detail: JSX.Element | null
  button: JSX.Element | null
}

export const SharedConfirmFooter = ({ detail, button, ...props }: SharedConfirmFooterProps) => {
  return (
    <Stack width='full' py={4} bg='background.surface.raised.accent' {...props}>
      {detail}
      {button}
    </Stack>
  )
}
