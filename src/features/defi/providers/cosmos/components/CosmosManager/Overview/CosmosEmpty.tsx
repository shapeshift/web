import { Button, Skeleton, Stack, VStack } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { EmptyOverview } from 'features/defi/components/EmptyOverview/EmptyOverview'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'

type CosmosEmptyProps = {
  assets: Asset[]
  apy: string | undefined
  onStakeClick?: () => void
  onLearnMoreClick?: () => void
}

export const CosmosEmpty = ({ assets, apy, onStakeClick, onLearnMoreClick }: CosmosEmptyProps) => {
  const [stakingAsset] = assets // TODO: Handle different denom rewards

  const emptyOverviewFooter = useMemo(
    () => (
      <VStack spacing={4} align='center' width='100%'>
        <Button width='full' colorScheme='blue' onClick={onStakeClick}>
          <Text translation={'defi.modals.cosmosOverview.cta'} />
        </Button>
        <Button width='full' onClick={onLearnMoreClick}>
          <Text translation={'defi.modals.cosmosOverview.learnMore'} />
        </Button>
      </VStack>
    ),
    [onStakeClick, onLearnMoreClick],
  )

  const getStartedHeaderTranslation: TextPropTypes['translation'] = useMemo(
    () => ['defi.modals.getStarted.header', { assetName: stakingAsset.name }],
    [stakingAsset.name],
  )

  return (
    <DefiModalContent>
      <EmptyOverview assets={assets} footer={emptyOverviewFooter}>
        <Stack direction='row' spacing={1} justifyContent='center' mb={4}>
          <Text translation={getStartedHeaderTranslation} />
          <Skeleton isLoaded={Boolean(apy)}>
            <Amount.Percent color='green.500' value={apy ?? ''} suffix='APR' />
          </Skeleton>
        </Stack>
        <Text color='text.subtle' translation='defi.modals.getStarted.body' />
        <Text color='text.subtle' translation='defi.modals.getStarted.userProtectionInfo' />
      </EmptyOverview>
    </DefiModalContent>
  )
}
