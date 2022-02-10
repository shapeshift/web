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
  useColorModeValue
} from '@chakra-ui/react'
import { caip19 } from '@shapeshiftoss/caip'
import { ContractTypes, NetworkTypes } from '@shapeshiftoss/types'
import qs from 'qs'
import { useHistory, useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { RawText, Text } from 'components/Text'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'
import { useAppSelector } from 'state/store'

import { MergedEarnVault } from '../hooks/useVaultBalances'

type StakingCardProps = {
  isLoaded?: boolean
} & MergedEarnVault

export const StakingCard = ({
  type,
  symbol,
  tokenAddress,
  vaultAddress,
  provider,
  chain,
  isLoaded,
  apy,
  cryptoAmount,
  fiatAmount,
  expired
}: StakingCardProps) => {
  const history = useHistory()
  const location = useLocation()
  const bgHover = useColorModeValue('gray.100', 'gray.700')
  const network = NetworkTypes.MAINNET
  const contractType = ContractTypes.ERC20
  const assetCAIP19 = caip19.toCAIP19({ chain, network, contractType, tokenId: tokenAddress })
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetCAIP19))

  const {
    state: { isConnected },
    dispatch
  } = useWallet()

  const handleClick = () => {
    isConnected
      ? history.push({
          pathname: `/defi/${type}/${provider}/withdraw`,
          search: qs.stringify({
            chain,
            contractAddress: vaultAddress,
            tokenId: tokenAddress
          }),
          state: { background: location }
        })
      : dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }

  if (!asset) return null

  return (
    <Card onClick={handleClick} as={Link} _hover={{ textDecoration: 'none', bg: bgHover }}>
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
                <Text translation='defi.currentValue' />
              </StatLabel>
            </Skeleton>
            <Skeleton isLoaded={isLoaded}>
              <StatNumber>
                <Amount.Fiat color={expired ? 'red.500' : 'white'} value={fiatAmount} />
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
