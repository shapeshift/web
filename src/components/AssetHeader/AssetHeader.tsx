import { ExternalLinkIcon } from '@chakra-ui/icons'
import type { ContainerProps, ResponsiveValue } from '@chakra-ui/react'
import { Container, Flex, Heading, IconButton, Link } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, isNft } from '@shapeshiftoss/caip'
import type { Property } from 'csstype'
import isEqual from 'lodash/isEqual'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { SEO } from 'components/Layout/Seo'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { middleEllipsis, tokenOrUndefined } from 'lib/utils'
import {
  selectAccountIdsByAssetId,
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetActions } from './AssetActions'

const paddingX = { base: 4, xl: 8 }

type AssetHeaderProps = {
  assetId?: AssetId
  accountId?: AccountId
} & ContainerProps

const externalLinkIcon = <ExternalLinkIcon />
const displayMdFlex = { base: 'none', md: 'flex' }
const fontSizeMd2xl = { base: 'xl', md: '2xl' }
const flexDirLgRow: ResponsiveValue<Property.FlexDirection> = { base: 'column', lg: 'row' }

export const AssetHeader: React.FC<AssetHeaderProps> = ({ assetId, accountId, ...rest }) => {
  const translate = useTranslate()
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId ?? ''))
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

  const isSnapInstalled = useIsSnapInstalled()
  const walletSupportsChain = useWalletSupportsChain({ chainId, wallet, isSnapInstalled })

  const filter = useMemo(() => ({ assetId, accountId }), [assetId, accountId])
  const cryptoBalance =
    useAppSelector(state => selectPortfolioCryptoPrecisionBalanceByFilter(state, filter)) ?? '0'

  const formattedPrice = toFiat(marketData.price)

  const href = (() => {
    const { assetReference } = fromAssetId(asset.assetId)
    const maybeToken = tokenOrUndefined(assetReference)

    if (isNft(asset.assetId)) {
      const [token] = assetReference.split('/')
      return `${asset.explorer}/token/${token}?a=${asset.id}`
    }

    if (maybeToken) return `${asset?.explorerAddressLink}${maybeToken}`

    return asset.explorer
  })()

  if (!chainId) return null
  if (!assetId) return null

  return (
    <Container width='full' maxWidth='container.4xl' px={paddingX} pb={4} pt={6} {...rest}>
      <Flex alignItems='center' flexDir={flexDirLgRow} flex={1}>
        <SEO title={`${asset.symbol} - ${formattedPrice}`} description={asset.description} />
        <Flex alignItems='center' mr='auto' flex={1}>
          <AssetIcon assetId={asset.assetId} />
          <Flex ml={3} textAlign='left' gap={2} alignItems='center'>
            <Heading fontSize={fontSizeMd2xl} lineHeight='shorter'>
              {name} {`(${symbol}${asset.id ? ` ${middleEllipsis(asset.id)}` : ''})`}
            </Heading>

            <IconButton
              as={Link}
              isExternal
              href={href}
              colorScheme='blue'
              aria-label={translate('defi.viewOnChain')}
              variant='ghost'
              icon={externalLinkIcon}
            />
          </Flex>
        </Flex>
        {walletSupportsChain ? (
          <Flex display={displayMdFlex}>
            <AssetActions
              assetId={assetId}
              accountId={accountId ? accountId : singleAccount}
              cryptoBalance={cryptoBalance}
            />
          </Flex>
        ) : null}
      </Flex>
    </Container>
  )
}
