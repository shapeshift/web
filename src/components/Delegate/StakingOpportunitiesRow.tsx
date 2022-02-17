import { Flex, HStack } from '@chakra-ui/layout'
import { Button, Skeleton, SkeletonCircle } from '@chakra-ui/react'
import { AprTag } from 'features/defi/components/AprTag/AprTag'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { RawText, Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'

// TODO: add proper args and types for Cosmos chains; wire up
export const StakingOpportunitiesRow = ({ name }: { name: string }) => {
  const isLoaded = true
  const { cosmos } = useModal()

  const handleGetStartedClick = () => {
    cosmos.open({ assetId: 'cosmoshub-4/slip44:118' })
  }

  return (
    <Button
      width='full'
      height='auto'
      justifyContent='space-between'
      variant='ghost'
      fontWeight='normal'
      py={2}
    >
      <Flex alignItems='center'>
        <Flex mr={4}>
          <SkeletonCircle boxSize='8' isLoaded={isLoaded}>
            <AssetIcon
              src={'https://assets.coingecko.com/coins/images/16724/small/osmo.png?1632763885'}
              boxSize='8'
            />
          </SkeletonCircle>
        </Flex>
        <Skeleton isLoaded={isLoaded}>
          <RawText size='lg' fontWeight='bold'>{`${name}`}</RawText>
        </Skeleton>
        <Skeleton isLoaded={isLoaded} ml={4}>
          <AprTag percentage='1.25' />
        </Skeleton>
      </Flex>
      <Flex>
        <Skeleton isLoaded={isLoaded}>
          {false ? (
            <HStack>
              <Amount.Fiat value={'20.00'} color='green.500' />
              <Amount.Crypto value={'10'} symbol={'OSMO'} prefix='≈' />
            </HStack>
          ) : (
            <Button
              onClick={handleGetStartedClick}
              as='span'
              colorScheme='blue'
              variant='ghost-filled'
              size='sm'
            >
              <Text translation='common.getStarted' />
            </Button>
          )}
        </Skeleton>
      </Flex>
    </Button>
  )
}
