import { Button, Skeleton, Stack, Text as CText } from '@chakra-ui/react'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import type { EmptyOverviewAsset } from 'features/defi/components/EmptyOverview/EmptyOverview'
import { EmptyOverview } from 'features/defi/components/EmptyOverview/EmptyOverview'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'

type FoxFarmingEmptyProps = {
  assets: EmptyOverviewAsset[]
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
  return (
    <DefiModalContent>
      <EmptyOverview
        assets={assets}
        footer={
          <Button width='full' colorScheme='blue' onClick={onClick}>
            <Text translation='defi.modals.foxFarmingOverview.cta' />
          </Button>
        }
      >
        <Stack spacing={1} justifyContent='center' mb={4}>
          <Text
            translation={[
              'defi.modals.foxFarmingOverview.header',
              { opportunity: opportunityName },
            ]}
          />
          <CText color='green.500'>
            <Skeleton isLoaded={Boolean(apy)}>
              <Amount.Percent value={apy ?? ''} suffix='APR' />
            </Skeleton>
          </CText>
        </Stack>
        <Text color='gray.500' translation='defi.modals.foxFarmingOverview.body' />
        <Text color='gray.500' translation='defi.modals.foxFarmingOverview.rewards' />
      </EmptyOverview>
    </DefiModalContent>
  )
}
