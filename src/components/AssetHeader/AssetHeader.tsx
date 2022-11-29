import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Flex, Heading, IconButton, Link } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import isEqual from 'lodash/isEqual'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { SEO } from 'components/Layout/Seo'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { tokenOrUndefined } from 'lib/utils'
import {
  selectAccountIdsByAssetId,
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoHumanBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetActions } from './AssetActions'

type AssetHeaderProps = {
  assetId: AssetId
  accountId?: AccountId
}

export const AssetHeader: React.FC<AssetHeaderProps> = ({ assetId, accountId }) => {
  const translate = useTranslate()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const {
    number: { toFiat },
  } = useLocaleFormatter()
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
  const cryptoBalance =
    useAppSelector(state => selectPortfolioCryptoHumanBalanceByFilter(state, filter)) ?? '0'

  const formattedPrice = toFiat(marketData.price)

  const { assetReference } = fromAssetId(asset.assetId)
  const maybeToken = tokenOrUndefined(assetReference)

  // If token is undefined, redirect to the basic explorer link
  // else redirect to the token explorer link
  const href = maybeToken ? `${asset?.explorerAddressLink}${maybeToken}` : asset?.explorer

  if (!chainId) return null

  return (
    <Flex alignItems='center' flexDir={{ base: 'column', lg: 'row' }} flex={1} py={4}>
      <SEO title={`${asset.symbol} - ${formattedPrice}`} description={asset.description} />
      <Flex alignItems='center' mr='auto' flex={1}>
        <AssetIcon assetId={asset.assetId} boxSize='40px' />
        <Flex ml={3} textAlign='left' gap={2} alignItems='center'>
          <Heading fontSize='2xl' lineHeight='shorter'>
            {name} {`(${symbol})`}
          </Heading>

          <IconButton
            as={Link}
            isExternal
            href={href}
            colorScheme='blue'
            aria-label={translate('defi.viewOnChain')}
            variant='ghost'
            icon={<ExternalLinkIcon />}
          />
        </Flex>
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
