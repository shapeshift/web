import { Stack } from '@chakra-ui/react'

type SharedConfirmFooterProps = {
  detail: React.ReactNode | null
  button: React.ReactNode
}

export const SharedConfirmFooter = ({ detail, button }: SharedConfirmFooterProps) => {
  return (
    <Stack width='full'>
      {detail}
      {button}
    </Stack>
  )
}
