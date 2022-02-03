import { Button } from '@chakra-ui/react'
import { Text } from 'components/Text'

type SendMaxButtonProps = {
  onClick(): Promise<void>
}

export const SendMaxButton = ({ onClick }: SendMaxButtonProps) => {
  return (
    <Button
      colorScheme='blue'
      h='1.75rem'
      onClick={onClick}
      size='sm'
      type='button'
      variant='ghost'
    >
      <Text translation='modals.send.sendForm.max' />
    </Button>
  )
}
