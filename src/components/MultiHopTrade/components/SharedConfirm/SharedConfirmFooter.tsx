import { Stack } from '@chakra-ui/react'

type SharedConfirmFooterProps = {
  detail: JSX.Element | null
  button: JSX.Element | null
}

export const SharedConfirmFooter = ({ detail, button }: SharedConfirmFooterProps) => {
  return (
    <Stack width='full'>
      {detail}
      {button}
    </Stack>
  )
}
