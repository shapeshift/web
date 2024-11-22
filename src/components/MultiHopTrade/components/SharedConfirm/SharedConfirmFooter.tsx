import { CardFooter, Stack } from '@chakra-ui/react'

type SharedConfirmFooterProps = {
  ConfirmDetailTable: React.ReactNode | null
  FooterButton: React.ReactNode
}

export const SharedConfirmFooter = ({
  ConfirmDetailTable,
  FooterButton,
}: SharedConfirmFooterProps) => {
  return (
    <CardFooter bg='background.surface.overlay.base' borderBottomRadius='xl'>
      <Stack width='full'>
        {ConfirmDetailTable}
        {FooterButton}
      </Stack>
    </CardFooter>
  )
}
