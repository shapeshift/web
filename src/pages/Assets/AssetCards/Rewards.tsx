import { Button, Flex, Stack, Tag } from '@chakra-ui/react'
import { ChainTypes } from '@shapeshiftoss/types'
import { FeatureFlagEnum } from 'constants/FeatureFlagEnum'
import qs from 'qs'
import { Link, useLocation } from 'react-router-dom'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { RawText, Text } from 'components/Text'
import { useFeature } from 'hooks/useFeature/useFeature'

export const Rewards = () => {
  const location = useLocation()
  const earnFeature = useFeature(FeatureFlagEnum.Yearn)
  if (!earnFeature) return null

  return (
    <Link
      to={{
        pathname: '/earn/vault/yearn/deposit',
        search: qs.stringify({
          chain: ChainTypes.Ethereum,
          contractAddress: '0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9', // yvUSDC vault address
          tokenId: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
        }),
        state: { background: location }
      }}
    >
      <Card variant='unstyled' size='sm' my={6}>
        <Card.Header>
          <Card.Heading color='gray.400'>
            <Text translation={'assets.assetCards.staking'} />
          </Card.Heading>
        </Card.Header>
        <Card.Body pt={0}>
          <Stack spacing={2} mt={2} mx={-4}>
            <Button
              width='full'
              height='auto'
              justifyContent='space-between'
              variant='ghost'
              py={2}
            >
              <Flex alignItems='center'>
                <Flex>
                  <AssetIcon symbol='fox' boxSize='8' mr={2} />
                </Flex>
                <RawText size='lg'>0.055555 FOX</RawText>
              </Flex>
              <Flex>
                <Tag colorScheme='green'>640% APR</Tag>
              </Flex>
            </Button>
            <Button
              width='full'
              height='auto'
              justifyContent='space-between'
              variant='ghost'
              py={2}
            >
              <Flex alignItems='center'>
                <Flex>
                  <AssetIcon symbol='eth' boxSize='8' mr={2} />
                </Flex>
                <RawText size='lg'>0.055555 USDC</RawText>
              </Flex>
              <Flex>
                <Tag colorScheme='green'>17.7% APR</Tag>
              </Flex>
            </Button>
          </Stack>
        </Card.Body>
      </Card>
    </Link>
  )
}
