import { CheckIcon } from '@chakra-ui/icons'
import { Circle } from '@chakra-ui/react'

export const JuicyGreenCheck = () => {
  // TODO: proper light/dark mode colors here
  return (
    <Circle size={8} bg='green.500' color='gray.800'>
      <CheckIcon />
    </Circle>
  )
}
