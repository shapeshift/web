import { Stack } from '@chakra-ui/react'

type SharedConfirmFooterProps = {
  ConfirmDetails: React.ReactNode | null
  FooterButton: React.ReactNode
}

export const SharedConfirmFooter = ({ ConfirmDetails, FooterButton }: SharedConfirmFooterProps) => {
  return (
    <Stack width='full'>
      {ConfirmDetails}
      {FooterButton}
    </Stack>
  )
}
