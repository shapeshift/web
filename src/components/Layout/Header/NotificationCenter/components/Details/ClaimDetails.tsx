import { Button, ButtonGroup, Stack } from '@chakra-ui/react'

export const ClaimDetails = () => {
  return (
    <Stack gap={4}>
      <ButtonGroup width='full'>
        <Button width='full' colorScheme='green'>
          Claim
        </Button>
      </ButtonGroup>
    </Stack>
  )
}
