import { Button, Stack } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { EmptyOverview } from 'features/defi/components/EmptyOverview/EmptyOverview'
import { Text } from 'components/Text'

type FoxyEmptyProps = {
  assets: Asset[]
  apy: string
  onClick?: () => void
}

export const FoxyEmpty = ({ assets, apy, onClick }: FoxyEmptyProps) => {
  return (
    <EmptyOverview
      assets={assets}
      footer={
        <Button isFullWidth colorScheme='blue' onClick={onClick}>
          <Text translation='defi.modals.foxyOverview.cta' />
        </Button>
      }
    >
      <Stack direction='row' spacing={1} justifyContent='center' mb={4}>
        <Text translation='defi.modals.foxyOverview.header' />
        <Text color='green.500' translation={['common.apy', { apy }]} />
      </Stack>
      <Text color='gray.500' translation='defi.modals.foxyOverview.body' />
      <Text color='gray.500' translation='defi.modals.foxyOverview.rewards' />
    </EmptyOverview>
  )
}
