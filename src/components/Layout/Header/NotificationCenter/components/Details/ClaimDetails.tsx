import { Button, ButtonGroup, Stack } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

export const ClaimDetails = () => {
  const translate = useTranslate()
  return (
    <Stack gap={4}>
      <ButtonGroup width='full' size='sm'>
        <Button width='full' colorScheme='green'>
          {translate('notificationCenter.claim')}
        </Button>
      </ButtonGroup>
    </Stack>
  )
}
