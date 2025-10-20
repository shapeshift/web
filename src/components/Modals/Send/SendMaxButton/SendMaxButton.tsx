import { Button } from '@chakra-ui/react'

import { Text } from '@/components/Text'

type SendMaxButtonProps = {
  onClick(): Promise<void>
  isDisabled?: boolean
}

export const SendMaxButton = ({ onClick, isDisabled }: SendMaxButtonProps) => {
  return (
    <Button size='sm' h='1.75rem' onClick={onClick} type='button' isDisabled={isDisabled}>
      <Text translation='modals.send.sendForm.max' />
    </Button>
  )
}
