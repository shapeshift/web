import { Button } from '@chakra-ui/react'

import { Text } from '@/components/Text'

type SendMaxButtonProps = {
  onClick(): Promise<void>
}

export const SendMaxButton = ({ onClick }: SendMaxButtonProps) => {
  return (
    <Button size='sm' h='1.75rem' onClick={onClick} type='button'>
      <Text translation='modals.send.sendForm.max' />
    </Button>
  )
}
