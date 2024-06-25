import { Button, Skeleton, Stack } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { EmptyOverview } from 'features/defi/components/EmptyOverview/EmptyOverview'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'

type FoxFarmingEmptyProps = {
  assets: Asset[]
  apy: string | undefined
  onClick?: () => void
  opportunityName: string
}

export const FoxFarmingEmpty = ({
  assets,
  apy,
  onClick,
  opportunityName,
}: FoxFarmingEmptyProps) => {
  const footer = useMemo(
    () => (
      <Button width='full' colorScheme='blue' onClick={onClick}>
        <Text translation='defi.modals.foxFarmingOverview.cta' />
      </Button>
    ),
    [onClick],
  )

  const foxFarmingOverviewHeaderTranslation: TextPropTypes['translation'] = useMemo(
    () => ['defi.modals.foxFarmingOverview.header', { opportunity: opportunityName }],
    [opportunityName],
  )

  return (
    <DefiModalContent>
      <EmptyOverview assets={assets} footer={footer}>
        <Stack spacing={1} justifyContent='center' mb={4}>
          <Text translation={foxFarmingOverviewHeaderTranslation} />
          <Skeleton isLoaded={Boolean(apy)}>
            <Amount.Percent color='green.500' value={apy ?? ''} suffix='APR' />
          </Skeleton>
        </Stack>
        <Text color='text.subtle' translation='defi.modals.foxFarmingOverview.body' />
        <Text color='text.subtle' translation='defi.modals.foxFarmingOverview.rewards' />
      </EmptyOverview>
    </DefiModalContent>
  )
}
