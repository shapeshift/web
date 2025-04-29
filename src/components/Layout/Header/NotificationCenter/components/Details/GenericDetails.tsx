import { Button, ButtonGroup, Stack } from '@chakra-ui/react'

export const GenericDetails = () => {
  return (
    <Stack gap={4}>
      <ButtonGroup width='full'>
        <Button width='full'>View Transaction</Button>
      </ButtonGroup>
    </Stack>
  )
}
