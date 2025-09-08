import type { StackProps } from '@chakra-ui/react'
import { Stack } from '@chakra-ui/react'
import type { JSX } from 'react'

type SharedConfirmFooterProps = StackProps & {
  detail: JSX.Element | null
  button: JSX.Element | null
}

const footerBgProp = { base: 'background.surface.base', md: 'darkNeutral.800' }

export const SharedConfirmFooter = ({ detail, button, ...props }: SharedConfirmFooterProps) => {
  return (
    <Stack width='full' py={4} bg={footerBgProp} {...props}>
      {detail}
      {button}
    </Stack>
  )
}
