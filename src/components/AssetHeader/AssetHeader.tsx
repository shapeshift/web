import { Box, Flex, Heading } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import isEqual from 'lodash/isEqual'
import { useMemo } from 'react'
import { AssetIcon } from 'components/AssetIcon'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import {
  selectAccountIdsByAssetId,
  selectAssetById,
  selectPortfolioCryptoHumanBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetActions } from './AssetActions'

type AssetHeaderProps = {
  assetId: AssetId
  accountId?: AccountId
}

export const AssetHeader: React.FC<AssetHeaderProps> = ({ assetId, accountId }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const chainId = asset.chainId
  const accountIdsFilter = useMemo(() => ({ assetId: assetId ?? '' }), [assetId])
  const accountIds = useAppSelector(
    state => selectAccountIdsByAssetId(state, accountIdsFilter),
    isEqual,
  )
  const singleAccount = accountIds && accountIds.length === 1 ? accountIds[0] : undefined
  const { name, symbol } = asset || {}

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
        <AssetIcon assetId={asset.assetId} boxSize='40px' />
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
