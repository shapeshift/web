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
import { AssetId, fromAssetId } from '@shapeshiftoss/caip'
import { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import {
  isCosmosChainId,
  isOsmosisChainId,
} from 'plugins/cosmos/components/modals/Staking/StakingCommon'
import qs from 'qs'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { getOverrideNameFromAssetId } from 'components/StakingVaults/utils'
import { RawText, Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { AssetsById } from 'state/slices/assetsSlice/assetsSlice'
import { selectAssetById, selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type OpportunityCardProps = {
  isLoaded?: boolean
} & EarnOpportunityType

const getOverrideIconFromAssetId = (assetId: AssetId, assets: AssetsById): string => {
  const overrideAssetIds: Record<AssetId, AssetId> = {
    'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d':
      'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3',
  }
  const overrideAssetId = overrideAssetIds[assetId] ?? assetId
  return assets[overrideAssetId]?.icon ?? ''
}

export const OpportunityCard = ({
  type,
  rewardAddress,
  contractAddress,
  provider,
  chainId,
  isLoaded,
  apy,
  cryptoAmount,
  fiatAmount,
  expired,
  moniker,
  assetId,
  icons,
  opportunityName,
}: OpportunityCardProps) => {
  const history = useHistory()
  const bgHover = useColorModeValue('gray.100', 'gray.700')
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const { assetReference } = fromAssetId(assetId)

  const assets = useAppSelector(selectAssets)

  const {
    state: { isConnected },
    dispatch,
  } = useWallet()

  const handleClick = () => {
    if (isConnected) {
      history.push({
        pathname: '/defi',
        search: qs.stringify({
          provider,
          chainId,
          contractAddress,
          assetReference,
          rewardId: rewardAddress,
          modal: 'overview',
        }),
      })
      return
    }

    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }

  if (!asset) return null

  const getOpportunityName = () => {
    if (opportunityName) return opportunityName
    const overridenName = getOverrideNameFromAssetId(assetId)
    if (overridenName) return overridenName
    if (!isCosmosChainId(chainId) && !isOsmosisChainId(chainId))
      return `${asset.symbol} ${type?.replace('_', ' ')}`
    if (isCosmosChainId(chainId) || isOsmosisChainId(chainId)) return moniker
  }

  return (
    <Card onClick={handleClick} as={Link} _hover={{ textDecoration: 'none', bg: bgHover }}>
      <Card.Body>
        <Flex alignItems='center'>
          <Flex>
            <SkeletonCircle boxSize='10' isLoaded={isLoaded}>
              {icons ? (
                <Flex flexDirection='row' alignItems='center' width={{ base: 'auto', md: '40%' }}>
                  {icons.map((iconSrc, i) => (
                    <AssetIcon
                      key={iconSrc}
                      src={iconSrc}
                      boxSize='9'
                      mr={i === icons.length - 1 ? 2 : 0}
                      ml={i === 0 ? '0' : '-4'}
                    />
                  ))}
                </Flex>
              ) : (
                <AssetIcon
                  src={getOverrideIconFromAssetId(assetId, assets)}
                  boxSize='10'
                  zIndex={2}
                />
              )}
            </SkeletonCircle>
          </Flex>
          <Box ml={icons ? 6 : 4}>
            <SkeletonText isLoaded={isLoaded} noOfLines={2}>
              <RawText size='lg' fontWeight='bold' textTransform='uppercase' lineHeight={1} mb={1}>
                {getOpportunityName()}
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
