import { Box, Flex } from '@chakra-ui/layout'
import {
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  Stat,
  StatGroup,
  StatLabel,
  StatNumber
} from '@chakra-ui/react'
import { caip19 } from '@shapeshiftoss/caip'
import { ContractTypes, NetworkTypes } from '@shapeshiftoss/types'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { RawText, Text } from 'components/Text'
import { useFetchAsset } from 'hooks/useFetchAsset/useFetchAsset'

import { MergedEarnVault } from '../hooks/useVaultBalances'

type StakingCardProps = {
  isLoaded?: boolean
} & MergedEarnVault

export const StakingCard = ({
  type,
  symbol,
  tokenAddress,
  chain,
  isLoaded,
  apy,
  cryptoAmount,
  fiatAmount
}: StakingCardProps) => {
  const network = NetworkTypes.MAINNET
  const contractType = ContractTypes.ERC20
  const assetCAIP19 = caip19.toCAIP19({ chain, network, contractType, tokenId: tokenAddress })
  const asset = useFetchAsset(assetCAIP19)

  if (!asset) return null

  return (
    <Card>
      <Card.Body>
        <Flex alignItems='center'>
          <Flex>
            <SkeletonCircle boxSize='10' isLoaded={isLoaded}>
              <AssetIcon src={asset.icon} boxSize='10' zIndex={2} />
            </SkeletonCircle>
          </Flex>
          <Box ml={4}>
            <SkeletonText isLoaded={isLoaded} noOfLines={2}>
              <RawText size='lg' fontWeight='bold' textTransform='uppercase' lineHeight={1} mb={1}>
                {`${asset.symbol} ${type}`}
              </RawText>
              <Amount.Crypto color='gray.500' value={cryptoAmount} symbol={symbol} lineHeight={1} />
            </SkeletonText>
          </Box>
        </Flex>
      </Card.Body>
      <Card.Footer>
        <StatGroup>
          <Stat>
            <Skeleton isLoaded={isLoaded}>
              <StatLabel>
                <Text translation='earn.rewardValue' />
              </StatLabel>
            </Skeleton>
            <Skeleton isLoaded={isLoaded}>
              <StatNumber>
                <Amount.Fiat value={fiatAmount} />
              </StatNumber>
            </Skeleton>
          </Stat>
          <Stat textAlign='right'>
            <Skeleton isLoaded={isLoaded} maxWidth='100px' ml='auto'>
              <StatLabel>
                <Text translation='earn.currentAPY' />
              </StatLabel>
            </Skeleton>
            <Skeleton isLoaded={isLoaded} maxWidth='100px' ml='auto'>
              <StatNumber color='green.500'>
                <Amount.Percent value={String(apy)} />
              </StatNumber>
            </Skeleton>
          </Stat>
        </StatGroup>
      </Card.Footer>
    </Card>
  )
}
