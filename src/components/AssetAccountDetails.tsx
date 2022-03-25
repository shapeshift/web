import { ArrowForwardIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  HStack,
  Image,
  Skeleton,
  SkeletonCircle,
  Stack
} from '@chakra-ui/react'
import { createContext } from '@chakra-ui/react-utils'
import { CAIP19 } from '@shapeshiftoss/caip'
import { Asset, MarketData } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { NavLink } from 'react-router-dom'
import { Route } from 'Routes/helpers'
import { AssetTransactionHistory } from 'components/TransactionHistory/AssetTransactionHistory'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { TradeCard } from 'pages/Dashboard/TradeCard'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import {
  selectAccountIdsByAssetId,
  selectAssetByCAIP19,
  selectMarketDataById,
  selectPortfolioAssetIdsByAccountIdExcludeFeeAsset,
  selectPortfolioCryptoHumanBalanceByFilter
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AccountAssetsList } from './AccountAssets/AccountAssetsList'
import { AssetAccountRow } from './AssetAccounts/AssetAccountRow'
import { AssetChart } from './AssetHeader/AssetChart'
import { AssetDescription } from './AssetHeader/AssetDescription'
import { AssetMarketData } from './AssetHeader/AssetMarketData'
import { Card } from './Card/Card'
import { Main } from './Layout/Main'
import { Text } from './Text'

type AssetDetailsProps = {
  assetId: CAIP19
  accountId?: AccountSpecifier
  route?: Route
}

export type AssetDetailsContext = {
  assetId: CAIP19
  asset: Asset
  accountId?: string // CAIP10
  accountIds: string[]
  marketData?: MarketData
  loading: boolean
}

const [AssetDetailsProvider, useAssetDetailsContext] = createContext<AssetDetailsContext>({
  name: 'AssetDetailsContext',
  errorMessage:
    'useAssetDetailsContext: `context` is undefined. Seems you forgot to wrap alert components in `<AssetDetails />`'
})

export const useAssetDetails = useAssetDetailsContext

export const AssetAccountDetails: React.FC<AssetDetailsProps> = props => {
  const asset = useAppSelector(state => selectAssetByCAIP19(state, props.assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, props.assetId))
  const accountIds = useAppSelector(state => selectAccountIdsByAssetId(state, props.assetId))

  return (
    <AssetDetailsProvider value={{ ...props, asset, accountIds, marketData, loading: !marketData }}>
      <Main titleComponent={<AssetHeader />}>
        <Stack
          alignItems='flex-start'
          spacing={4}
          mx='auto'
          direction={{ base: 'column', xl: 'row' }}
        >
          <Stack spacing={4} flex='1 1 0%' width='full'>
            {props.children || (
              <>
                <AssetChart accountId={props.accountId} assetId={props.assetId} isLoaded={true} />
                <AccountAssets />
                <AssetAccounts />
                <AssetTransactionHistory
                  limit={3}
                  assetId={props.assetId}
                  accountId={props.accountId}
                />
              </>
            )}
          </Stack>
          <Stack flex='1 1 0%' width='full' maxWidth={{ base: 'full', xl: 'sm' }} spacing={4}>
            <TradeCard />
            <AssetMarketData assetId={props.assetId} />
            <AssetDescription assetId={props.assetId} />
          </Stack>
        </Stack>
      </Main>
    </AssetDetailsProvider>
  )
}

export const Chart: React.FC = () => {
  const { accountId, assetId } = useAssetDetailsContext()
  return <AssetChart accountId={accountId} assetId={assetId} isLoaded={true} />
}

export const AssetOpportunities: React.FC = props => {
  const { children } = props

  return (
    <Card>
      <Card.Header flexDir='row' display='flex'>
        <HStack gap={6} width='full'>
          <Box>
            <Card.Heading>
              <Text translation='defi.earn' />
            </Card.Heading>
            <Text color='gray.500' translation='defi.earnBody' />
          </Box>
          <Box flex={1} textAlign='right'>
            <Button
              size='sm'
              variant='link'
              colorScheme='blue'
              ml='auto'
              as={NavLink}
              to='/defi/earn'
            >
              <Text translation='common.seeAll' /> <ArrowForwardIcon />
            </Button>
          </Box>
        </HStack>
      </Card.Header>
      <Card.Body pt={0} px={2}>
        {children}
      </Card.Body>
    </Card>
  )
}

export const AssetHeader: React.FC = props => {
  const { assetId, accountId, asset, loading } = useAssetDetailsContext()
  const chainId = asset.caip2
  const { name, symbol, icon } = asset || {}

  const {
    state: { wallet }
  } = useWallet()

  const walletSupportsChain = useWalletSupportsChain({ chainId, wallet })

  const filter = useMemo(() => ({ assetId, accountId }), [assetId, accountId])
  const cryptoBalance = useAppSelector(state =>
    selectPortfolioCryptoHumanBalanceByFilter(state, filter)
  )

  if (!chainId) return null

  return (
    <Flex alignItems='center' flexDir={{ base: 'column', lg: 'row' }} flex={1} py={4}>
      <Flex alignItems='center' mr='auto'>
        <SkeletonCircle boxSize='40px' isLoaded={!loading}>
          <Image src={icon} boxSize='40px' fallback={<SkeletonCircle boxSize='40px' />} />
        </SkeletonCircle>
        <Box ml={3} textAlign='left'>
          <Skeleton isLoaded={!loading}>
            <Heading fontSize='2xl' lineHeight='shorter'>
              {name} {`(${symbol})`}
            </Heading>
          </Skeleton>
        </Box>
      </Flex>
      {/*{walletSupportsChain ? (*/}
      {/*  <AssetActions*/}
      {/*    isLoaded={!loading}*/}
      {/*    assetId={assetId}*/}
      {/*    accountId={accountId ? accountId : ''}*/}
      {/*    cryptoBalance={cryptoBalance}*/}
      {/*  />*/}
      {/*) : null}*/}
    </Flex>
  )
}

export const AccountAssets: React.FC = () => {
  const { asset, accountId } = useAssetDetailsContext()
  const assetIds = useAppSelector(state =>
    selectPortfolioAssetIdsByAccountIdExcludeFeeAsset(state, accountId ?? '')
  )

  // @TODO: This filters for ETH to not show tokens component on tokens
  if (!(accountId && asset.tokenId && assetIds.length > 0)) return null

  return (
    <Card>
      <Card.Header>
        <Card.Heading>
          <Text translation='assets.assetCards.accountTokens' />
        </Card.Heading>
      </Card.Header>
      <Card.Body pt={0}>
        <AccountAssetsList accountId={accountId} assetIds={assetIds} limit={5} />
      </Card.Body>
    </Card>
  )
}

export const AssetAccounts = () => {
  const translate = useTranslate()
  const { assetId, accountId, accountIds } = useAssetDetailsContext()

  if ((accountIds && accountIds.length === 0) || accountId) return null

  return (
    <Card>
      <Card.Header>
        <Card.Heading>
          {translate('assets.assetDetails.assetAccounts.assetAllocation')}
        </Card.Heading>
      </Card.Header>
      <Card.Body pt={0}>
        <Stack spacing={2} mt={2} mx={-4}>
          <Grid
            templateColumns={{
              base: '1fr 1fr',
              md: '1fr 1fr 1fr',
              lg: '2fr 150px repeat(2, 1fr)'
            }}
            gap='1rem'
            pl={4}
            pr={4}
            fontSize='sm'
            lineHeight='shorter'
          >
            <Text translation='assets.assetDetails.assetAccounts.account' color='gray.500' />
            <Text
              translation='assets.assetDetails.assetAccounts.allocation'
              color='gray.500'
              textAlign='right'
              display={{ base: 'none', lg: 'block' }}
            />
            <Text
              translation='assets.assetDetails.assetAccounts.amount'
              display={{ base: 'none', md: 'block', lg: 'block' }}
              color='gray.500'
              textAlign='right'
            />
            <Text
              translation='assets.assetDetails.assetAccounts.value'
              textAlign='right'
              color='gray.500'
            />
          </Grid>
          {accountIds.map((id, i) => (
            <AssetAccountRow accountId={id} assetId={assetId} key={i} showAllocation />
          ))}
        </Stack>
      </Card.Body>
    </Card>
  )
}
