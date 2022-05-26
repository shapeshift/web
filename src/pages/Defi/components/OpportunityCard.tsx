import { Box, Flex } from '@chakra-ui/layout'
import {
  Link,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  Stat,
  StatGroup,
  StatLabel,
  StatNumber,
  useColorModeValue,
} from '@chakra-ui/react'
import { ChainTypes } from '@shapeshiftoss/types'
import { Asset } from '@shapeshiftoss/types'
import { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import qs from 'qs'
import { useHistory, useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { RawText, Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type OpportunityCardProps = {
  isLoaded?: boolean
  overrideAssetIconID: (asset: Asset) => string
} & EarnOpportunityType

export const OpportunityCard = ({
  type,
  tokenAddress,
  rewardAddress,
  contractAddress,
  provider,
  chain,
  isLoaded,
  apy,
  cryptoAmount,
  fiatAmount,
  expired,
  moniker,
  assetId,
  overrideAssetIconID,
}: OpportunityCardProps) => {
  const history = useHistory()
  const location = useLocation()
  const bgHover = useColorModeValue('gray.100', 'gray.700')
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const { cosmosStaking } = useModal()
  const isCosmosStaking = chain === ChainTypes.Cosmos

  const {
    state: { isConnected },
    dispatch,
  } = useWallet()

  const handleClick = () => {
    if (isConnected) {
      if (isCosmosStaking) {
        cosmosStaking.open({
          assetId,
          validatorAddress: contractAddress,
        })
        return
      }

      // TODO remove this condition once staking modals are unified
      // Currently vault staking modals do not have overview tab
      const pathname =
        type === DefiType.TokenStaking
          ? `/defi/${type}/${provider}/overview`
          : `/defi/${type}/${provider}/withdraw`

      history.push({
        pathname,
        search: qs.stringify({
          chain,
          contractAddress,
          tokenId: tokenAddress,
          rewardId: rewardAddress,
        }),
        state: { background: location },
      })
      return
    }

    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }

  if (!asset) return null

  return (
    <Card onClick={handleClick} as={Link} _hover={{ textDecoration: 'none', bg: bgHover }}>
      <Card.Body>
        <Flex alignItems='center'>
          <Flex>
            <SkeletonCircle boxSize='10' isLoaded={isLoaded}>
              <AssetIcon src={overrideAssetIconID(asset)} boxSize='10' zIndex={2} />
            </SkeletonCircle>
          </Flex>
          <Box ml={4}>
            <SkeletonText isLoaded={isLoaded} noOfLines={2}>
              <RawText size='lg' fontWeight='bold' textTransform='uppercase' lineHeight={1} mb={1}>
                {!isCosmosStaking && `${asset.symbol} ${type?.replace('_', ' ')}`}
                {isCosmosStaking && `${moniker}`}
              </RawText>
              <Amount.Crypto
                color='gray.500'
                value={cryptoAmount}
                symbol={asset.symbol}
                lineHeight={1}
              />
            </SkeletonText>
          </Box>
        </Flex>
      </Card.Body>
      <Card.Footer>
        <StatGroup>
          <Stat>
            <Skeleton isLoaded={isLoaded}>
              <StatLabel>
                <Text translation='defi.currentValue' />
              </StatLabel>
            </Skeleton>
            <Skeleton isLoaded={isLoaded}>
              <StatNumber>
                <Amount.Fiat color={expired ? 'red.500' : ''} value={fiatAmount} />
              </StatNumber>
            </Skeleton>
          </Stat>
          <Stat textAlign='right'>
            <Skeleton isLoaded={isLoaded} maxWidth='100px' ml='auto'>
              <StatLabel>
                <Text translation='defi.currentAPY' />
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
