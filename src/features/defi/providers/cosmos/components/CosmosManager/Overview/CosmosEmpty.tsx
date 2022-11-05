import { Button, Skeleton, Stack, Text as CText, VStack } from '@chakra-ui/react'
import type { Asset } from '@keepkey/asset-service'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { EmptyOverview } from 'features/defi/components/EmptyOverview/EmptyOverview'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'

type CosmosEmptyProps = {
  assets: Asset[]
  apy: string | undefined
  onStakeClick?: () => void
  onLearnMoreClick?: () => void
}

export const CosmosEmpty = ({ assets, apy, onStakeClick, onLearnMoreClick }: CosmosEmptyProps) => {
  const [stakingAsset] = assets // TODO: Handle different denom rewards
  return (
    <DefiModalContent>
      <EmptyOverview
        assets={assets}
        footer={
          <VStack spacing={4} align='center' width='100%'>
            <Button width='full' colorScheme='blue' onClick={onStakeClick}>
              <Text translation={'defi.modals.cosmosOverview.cta'} />
            </Button>
            <Button width='full' onClick={onLearnMoreClick}>
              <Text translation={'defi.modals.cosmosOverview.learnMore'} />
            </Button>
          </VStack>
        }
      >
        <Stack direction='row' spacing={1} justifyContent='center' mb={4}>
          <Text translation={['defi.modals.getStarted.header', { assetName: stakingAsset.name }]} />
          <CText color='green.500'>
            <Skeleton isLoaded={Boolean(apy)}>
              <Amount.Percent value={apy ?? ''} suffix='APR' />
            </Skeleton>
          </CText>
        </Stack>
        <Text color='gray.500' translation='defi.modals.getStarted.body' />
        <Text color='gray.500' translation='defi.modals.getStarted.userProtectionInfo' />
      </EmptyOverview>
    </DefiModalContent>
  )
}
