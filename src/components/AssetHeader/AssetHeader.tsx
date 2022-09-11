import { Box, Flex, Heading, Image, SkeletonCircle } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import type { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import {
  selectAccountIdsByAssetId,
  selectAssetById,
  selectPortfolioCryptoHumanBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetActions } from './AssetActions'

type AssetHeaderProps = {
  assetId: AssetId
  accountId?: AccountSpecifier
}

export const AssetHeader: React.FC<AssetHeaderProps> = ({ assetId, accountId }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const chainId = asset.chainId
  const accountIds = useAppSelector(state => selectAccountIdsByAssetId(state, { assetId }))
  const singleAccount = accountIds && accountIds.length === 1 ? accountIds[0] : undefined
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
        <Image src={icon} boxSize='40px' fallback={<SkeletonCircle boxSize='40px' />} />
        <Box ml={3} textAlign='left'>
          <Heading fontSize='2xl' lineHeight='shorter'>
            {name} {`(${symbol})`}
          </Heading>
        </Box>
      </Flex>
      {walletSupportsChain ? (
        <AssetActions
          assetId={assetId}
          accountId={accountId ? accountId : singleAccount}
          cryptoBalance={cryptoBalance}
        />
      ) : null}
    </Flex>
  )
}
