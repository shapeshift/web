import { Button, ButtonGroup, Stack } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
export const GenericDetails = () => {
  const translate = useTranslate()
  return (
    <Stack gap={4}>
      <ButtonGroup width='full' size='sm'>
        <Button width='full'>{translate('notificationCenter.viewTransaction')}</Button>
      </ButtonGroup>
    </Stack>
  )
}
