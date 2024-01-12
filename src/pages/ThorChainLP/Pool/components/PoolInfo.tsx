import { ArrowUpIcon } from '@chakra-ui/icons'
import { Card, Flex, Stack } from '@chakra-ui/react'
import { Tag, TagLeftIcon } from '@chakra-ui/tag'
import { ethAssetId } from '@shapeshiftoss/caip'
import { usdcAssetId } from 'test/mocks/accounts'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text'

type PoolInfoProps = {
  volume24h?: string
  apy?: string
  tvl?: string
}

export const PoolInfo = ({ volume24h, apy, tvl }: PoolInfoProps) => {
  return (
    <>
      <Flex gap={4} alignItems='center'>
        <Text translation='lending.poolInformation' fontWeight='medium' />
        <Tag colorScheme='green'>
          <Amount.Percent value={apy ?? 0} suffix='APY' />
        </Tag>
      </Flex>
      <Flex flexWrap='wrap' gap={4} mx={-2}>
        <Card borderRadius='full'>
          <Flex gap={2} pl={2} pr={3} py={2} alignItems='center'>
            <AssetIcon size='xs' assetId={usdcAssetId} />
            <Amount.Fiat value='1' prefix='1 USDC =' fontSize='xs' fontWeight='medium' />
          </Flex>
        </Card>
        <Card borderRadius='full'>
          <Flex gap={2} pl={2} pr={3} py={2} alignItems='center'>
            <AssetIcon size='xs' assetId={ethAssetId} />
            <Amount.Fiat value='2' prefix='1 ETH =' fontSize='xs' fontWeight='medium' />
          </Flex>
        </Card>
      </Flex>
      <Flex flexWrap='wrap' gap={12}>
        <Stack spacing={0} flex={1}>
          <Flex alignItems='center' gap={2}>
            <Amount.Fiat fontSize='xl' value={tvl ?? 0} fontWeight='medium' />
            <Tag colorScheme='green' size='sm' gap={0}>
              <TagLeftIcon as={ArrowUpIcon} mr={1} />
              <Amount.Percent value='0.02' autoColor fontWeight='medium' />
            </Tag>
          </Flex>
          <Text
            fontSize='sm'
            color='text.subtle'
            fontWeight='medium'
            translation='pools.totalLiquidity'
          />
        </Stack>
        <Stack spacing={0} flex={1}>
          <Flex alignItems='center' gap={2}>
            <Amount.Fiat fontSize='xl' value={tvl ?? '0'} fontWeight='medium' />
            <Tag colorScheme='green' size='sm' gap={0}>
              <TagLeftIcon as={ArrowUpIcon} mr={1} />
              <Amount.Percent value='0.02' autoColor fontWeight='medium' />
            </Tag>
          </Flex>
          <Text
            fontSize='sm'
            color='text.subtle'
            fontWeight='medium'
            translation='pools.totalVolume'
          />
        </Stack>
      </Flex>
      <Flex flexWrap='wrap' gap={12}>
        <Stack spacing={0} flex={1}>
          <Flex alignItems='center' gap={2}>
            <Amount.Fiat fontSize='xl' value={volume24h ?? 0} fontWeight='medium' />
            <Tag colorScheme='green' size='sm' gap={0}>
              <TagLeftIcon as={ArrowUpIcon} mr={1} />
              <Amount.Percent value='0.02' autoColor fontWeight='medium' />
            </Tag>
          </Flex>
          <Text
            fontSize='sm'
            color='text.subtle'
            fontWeight='medium'
            translation='pools.volume24h'
          />
        </Stack>
        <Stack spacing={0} flex={1}>
          <Flex alignItems='center' gap={2}>
            <Amount.Fiat fontSize='xl' value='6' fontWeight='medium' />
            <Tag colorScheme='green' size='sm' gap={0}>
              <TagLeftIcon as={ArrowUpIcon} mr={1} />
              <Amount.Percent value='0.02' autoColor fontWeight='medium' />
            </Tag>
          </Flex>
          <Text fontSize='sm' color='text.subtle' fontWeight='medium' translation='pools.fees24h' />
        </Stack>
      </Flex>
    </>
  )
}
