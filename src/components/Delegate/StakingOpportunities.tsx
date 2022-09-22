import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, HStack, Skeleton, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { cosmosChainId, fromAssetId, osmosisChainId } from '@shapeshiftoss/caip'
import { chainIdToLabel } from 'features/defi/helpers/utils'
import { AprTag } from 'plugins/cosmos/components/AprTag/AprTag'
import type { MatchParams } from 'plugins/cosmos/CosmosAccount'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { NavLink, useHistory, useParams } from 'react-router-dom'
import type { Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { RawText, Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { OpportunitiesDataFull } from 'state/slices/selectors'
import {
  selectAssetById,
  selectHasActiveStakingOpportunity,
  selectMarketDataById,
  selectPortfolioAccountIdsByAssetId,
  selectStakingOpportunitiesDataFull,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type StakingOpportunitiesProps = {
  assetId: AssetId
}

type ValidatorNameProps = {
  chainId: ChainId
  moniker: string
  isStaking: boolean
  validatorAddress: string
  apr?: string
}

export const ValidatorName = ({
  moniker,
  isStaking,
  validatorAddress,
  chainId,
  apr,
}: ValidatorNameProps) => {
  const assetIcon = useMemo(() => {
    if (!isStaking) return 'https://assets.coincap.io/assets/icons/256/atom.png'

    const cosmostationChainName = (() => {
      switch (chainId) {
        case cosmosChainId:
          return 'cosmoshub'
        case osmosisChainId:
          return 'osmosis'
        default:
          return ''
      }
    })()

    return `https://raw.githubusercontent.com/cosmostation/cosmostation_token_resource/master/moniker/${cosmostationChainName}/${validatorAddress}.png`
  }, [isStaking, validatorAddress, chainId])

  return (
    <Box cursor='pointer'>
      <Flex alignItems='center' maxWidth='180px' gap={4}>
        <AssetIcon src={assetIcon} boxSize='8' />
        <Stack spacing={2} alignItems='flex-start'>
          <RawText fontWeight='bold'>{`${moniker}`}</RawText>
          {apr && (
            <AprTag
              display={{ base: 'inline-flex', md: 'none' }}
              size='sm'
              percentage={apr}
              showAprSuffix
            />
          )}
        </Stack>
      </Flex>
    </Box>
  )
}

export const StakingOpportunities = ({ assetId }: StakingOpportunitiesProps) => {
  const history = useHistory()
  const { accountSubId } = useParams<MatchParams>()
  // See ac0a08128d - We need this prefix because of routing, accountSubId doesn't include the ChainNamespace CAIP-2 part
  const filter = useMemo(() => ({ assetId }), [assetId])
  const allAccountIds = useAppSelector(state => selectPortfolioAccountIdsByAssetId(state, filter))
  // TODO: This uses account zero for assets page until we implement actual enumeration
  const accountId: AccountId = useMemo(
    () => (accountSubId ? `cosmos:${accountSubId}` : allAccountIds[0]),
    [allAccountIds, accountSubId],
  )

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const stakingOpportunitiesData = useAppSelector(state =>
    selectStakingOpportunitiesDataFull(state, { accountSpecifier: accountId, assetId }),
  )

  const hasActiveStaking = useAppSelector(state =>
    selectHasActiveStakingOpportunity(state, { accountSpecifier: accountId, assetId }),
  )

  const rows = stakingOpportunitiesData

  const handleClick = useCallback(
    (values: Row<OpportunitiesDataFull>) => {
      const { chainId, assetReference } = fromAssetId(assetId)
      const provider = chainIdToLabel(chainId)
      history.push({
        search: qs.stringify({
          defaultAccountId: accountId,
          provider,
          chainId,
          contractAddress: values.original.address,
          assetReference,
          modal: 'overview',
        }),
      })
    },
    [accountId, assetId, history],
  )

  const columns = useMemo(
    () => [
      {
        Header: <Text translation='defi.validator' />,
        id: 'moniker',
        display: { base: 'table-cell' },
        Cell: ({ row }: { row: { original: OpportunitiesDataFull } }) => {
          const validator = row.original

          return (
            <Skeleton isLoaded={validator.isLoaded}>
              <ValidatorName
                validatorAddress={validator?.address}
                moniker={validator?.moniker}
                isStaking={true}
                chainId={asset?.chainId}
                apr={validator?.apr}
              />
            </Skeleton>
          )
        },
        disableSortBy: true,
      },
      {
        Header: <Text translation='defi.apr' />,
        id: 'apr',
        display: { base: 'none', md: 'table-cell' },
        Cell: ({ row }: { row: { original: OpportunitiesDataFull } }) => {
          const validator = row.original
          return (
            <Skeleton isLoaded={validator.isLoaded}>
              <AprTag percentage={validator?.apr} showAprSuffix />
            </Skeleton>
          )
        },
        disableSortBy: true,
      },
      {
        Header: <Text translation='defi.stakedAmount' />,
        id: 'cryptoAmount',
        isNumeric: true,
        display: { base: 'table-cell' },
        Cell: ({ row }: { row: { original: OpportunitiesDataFull } }) => {
          const { isLoaded, totalDelegations } = row.original

          return (
            <Skeleton isLoaded={isLoaded}>
              {bnOrZero(totalDelegations).gt(0) ? (
                <Amount.Crypto
                  value={bnOrZero(totalDelegations)
                    .div(`1e+${asset.precision}`)
                    .decimalPlaces(asset.precision)
                    .toString()}
                  symbol={asset.symbol}
                  color='white'
                  fontWeight={'normal'}
                />
              ) : (
                <Box minWidth={{ base: '0px', md: '200px' }} />
              )}
            </Skeleton>
          )
        },
        disableSortBy: true,
      },
      {
        Header: <Text translation='defi.rewards' />,
        id: 'rewards',
        display: { base: 'table-cell' },
        Cell: ({ row }: { row: { original: OpportunitiesDataFull } }) => {
          const { totalDelegations, rewards: validatorRewards, isLoaded } = row.original
          const rewards = bnOrZero(validatorRewards)

          return (
            <Skeleton isLoaded={isLoaded}>
              {bnOrZero(totalDelegations).gt(0) ? (
                <HStack fontWeight={'normal'}>
                  <Amount.Crypto
                    value={bnOrZero(rewards)
                      .div(`1e+${asset.precision}`)
                      .decimalPlaces(asset.precision)
                      .toString()}
                    symbol={asset.symbol}
                  />
                  <Amount.Fiat
                    value={bnOrZero(rewards)
                      .div(`1e+${asset.precision}`)
                      .times(bnOrZero(marketData.price))
                      .toPrecision()}
                    color='green.500'
                    prefix='≈'
                  />
                </HStack>
              ) : (
                <Box width='100%' textAlign={'right'}>
                  <Button
                    as='span'
                    colorScheme='blue'
                    variant='ghost-filled'
                    size='sm'
                    cursor='pointer'
                  >
                    <Text translation='common.getStarted' />
                  </Button>
                </Box>
              )}
            </Skeleton>
          )
        },
        disableSortBy: true,
      },
    ],
    // React-tables requires the use of a useMemo
    // but we do not want it to recompute the values onClick
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accountId],
  )

  return (
    <Card>
      <Card.Header flexDir='row' display='flex'>
        <HStack justify='space-between' flex={1}>
          <Card.Heading>
            <Text translation='staking.staking' />
          </Card.Heading>

          <Button size='sm' variant='link' colorScheme='blue' as={NavLink} to='/defi/earn'>
            <Text translation='common.seeAll' /> <ArrowForwardIcon />
          </Button>
        </HStack>
      </Card.Header>
      <Card.Body pt={0} px={2}>
        <ReactTable
          data={rows}
          columns={columns}
          displayHeaders={hasActiveStaking}
          onRowClick={handleClick}
        />
      </Card.Body>
    </Card>
  )
}
