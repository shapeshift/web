import { Box, Flex, Heading, Image, Skeleton, SkeletonCircle } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import {
  selectAccountIdsByAssetId,
  selectAssetByCAIP19,
  selectMarketDataById,
  selectPortfolioCryptoHumanBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetActions } from './AssetActions'

type AssetHeaderProps = {
  assetId: CAIP19
  accountId?: AccountSpecifier
}

export const AssetHeader: React.FC<AssetHeaderProps> = ({ assetId, accountId }) => {
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const chainId = asset.caip2
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const accountIds = useAppSelector(state => selectAccountIdsByAssetId(state, assetId))
  const singleAccount = accountIds && accountIds.length === 1 ? accountIds[0] : undefined
  const isLoaded = !!marketData
  const { name, symbol, icon } = asset || {}

  const {
    state: { wallet },
  } = useWallet()

  const walletSupportsChain = useWalletSupportsChain({ chainId, wallet })

  const filter = useMemo(() => ({ assetId, accountId }), [assetId, accountId])
  const cryptoBalance = useAppSelector(state =>
    selectPortfolioCryptoHumanBalanceByFilter(state, filter),
  )

  if (!chainId) return null

  return (
    <Flex alignItems='center' flexDir={{ base: 'column', lg: 'row' }} flex={1} py={4}>
      <Flex alignItems='center' mr='auto'>
        <SkeletonCircle boxSize='40px' isLoaded={isLoaded}>
          <Image src={icon} boxSize='40px' fallback={<SkeletonCircle boxSize='40px' />} />
        </SkeletonCircle>
        <Box ml={3} textAlign='left'>
          <Skeleton isLoaded={isLoaded}>
            <Heading fontSize='2xl' lineHeight='shorter'>
              {name} {`(${symbol})`}
            </Heading>
          </Skeleton>
        </Box>
      </Flex>
      {walletSupportsChain ? (
        <AssetActions
          isLoaded={isLoaded}
          assetId={assetId}
          accountId={accountId ? accountId : singleAccount}
          cryptoBalance={cryptoBalance}
        />
      ) : null}
    </Flex>
  )
}
