import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, HStack, Skeleton, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { AprTag } from 'plugins/cosmos/components/AprTag/AprTag'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { NavLink, useHistory } from 'react-router-dom'
import type { CellProps, ColumnGroup, Renderer, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { RawText, Text } from 'components/Text'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { UserStakingOpportunityWithMetadata } from 'state/slices/opportunitiesSlice/types'
import { deserializeUserStakingId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectIsActiveStakingOpportunityByFilter,
  selectMarketDataById,
  selectUserStakingOpportunitiesWithMetadataByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type StakingOpportunitiesProps = {
  accountId?: AccountId
  assetId: AssetId
}

type ValidatorNameProps = {
  iconSrc: string
  moniker: string
  apr?: string
}

export const ValidatorName = ({ iconSrc, moniker, apr }: ValidatorNameProps) => {
  return (
    <Box cursor='pointer'>
      <Flex alignItems='center' maxWidth='180px' gap={4}>
        <AssetIcon src={iconSrc} boxSize='8' />
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

export const StakingOpportunities = ({
  assetId,
  accountId: routeAccountId,
}: StakingOpportunitiesProps) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)

  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const history = useHistory()

  const userStakingOpportunitiesFilter = useMemo(
    () => ({
      accountId: routeAccountId ?? '',
      assetId: assetId ?? '',
      defiProvider: DefiProvider.CosmosSdk,
    }),
    [routeAccountId, assetId],
  )
  const userStakingOpportunities = useAppSelector(state =>
    selectUserStakingOpportunitiesWithMetadataByFilter(state, userStakingOpportunitiesFilter),
  )
  const isActive = useAppSelector(state =>
    selectIsActiveStakingOpportunityByFilter(state, userStakingOpportunitiesFilter),
  )

  const handleClick = useCallback(
    (values: Row<UserStakingOpportunityWithMetadata>) => {
      const { chainId, assetReference, assetNamespace } = fromAssetId(assetId)
      const { account: validatorAddress } = fromAccountId(values.original.id)
      const [opportunityAccountId] = deserializeUserStakingId(values.original.userStakingId)
      history.push({
        search: qs.stringify({
          accountId: routeAccountId ?? opportunityAccountId,
          provider: DefiProvider.CosmosSdk,
          chainId,
          contractAddress: validatorAddress,
          assetReference,
          assetNamespace,
          modal: 'overview',
          type: DefiType.Staking, //TODO(pastaghost): Don't hardcode. Get type from opportunity properties instead.
        }),
      })
    },
    [routeAccountId, assetId, history],
  )

  const columns: (ColumnGroup<UserStakingOpportunityWithMetadata> & {
    Cell: Renderer<CellProps<UserStakingOpportunityWithMetadata>>
  })[] = useMemo(
    () => [
      {
        Header: <Text translation='defi.validator' />,
        id: 'moniker',
        // @ts-ignore this isn't a standard property of column but is somehow used by our <ReactTable /> implementation and passed down
        // to Chakra components
        display: { base: 'table-cell' },
        Cell: ({ row: { original: opportunityData } }) => (
          <Skeleton isLoaded={Boolean(opportunityData)}>
            <ValidatorName
              iconSrc={opportunityData.icon ?? ''}
              moniker={opportunityData?.name!}
              apr={opportunityData?.apy}
            />
          </Skeleton>
        ),
        disableSortBy: true,
      },
      {
        Header: <Text translation='defi.apr' />,
        id: 'apr',
        // @ts-ignore this isn't a standard property of column but is somehow used by our <ReactTable /> implementation and passed down
        // to Chakra components
        display: { base: 'none', md: 'table-cell' },
        Cell: ({ row }: { row: { original: UserStakingOpportunityWithMetadata } }) => {
          const opportunityData = row.original
          return (
            <Skeleton isLoaded={Boolean(opportunityData)}>
              <AprTag percentage={opportunityData?.apy} showAprSuffix />
            </Skeleton>
          )
        },
        disableSortBy: true,
      },
      {
        Header: <Text translation='defi.stakedAmount' />,
        id: 'cryptoAmount',
        // @ts-ignore this isn't a standard property of column but is somehow used by our <ReactTable /> implementation and passed down
        // to Chakra components
        isNumeric: true,
        display: { base: 'table-cell' },
        Cell: ({ row: { original: opportunityData } }) => {
          const { stakedAmountCryptoBaseUnit } = opportunityData

          return (
            <Skeleton isLoaded={Boolean(opportunityData)}>
              {bnOrZero(stakedAmountCryptoBaseUnit).gt(0) ? (
                <Amount.Crypto
                  value={bnOrZero(stakedAmountCryptoBaseUnit)
                    .div(bn(10).pow(asset.precision))
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
        // @ts-ignore this isn't a standard property of column but is somehow used by our <ReactTable /> implementation and passed down
        // to Chakra components
        display: { base: 'table-cell' },
        Cell: ({ row: { original: opportunityData } }) => (
          <Skeleton isLoaded={Boolean(opportunityData)}>
            {bnOrZero(opportunityData.rewardsCryptoBaseUnit?.amounts[0]).gt(0) ? (
              <HStack fontWeight={'normal'}>
                <Amount.Crypto
                  value={bnOrZero(opportunityData?.rewardsCryptoBaseUnit?.amounts[0] ?? 0)
                    .div(bn(10).pow(asset.precision))
                    .decimalPlaces(asset.precision)
                    .toString()}
                  symbol={asset.symbol}
                />
                <Amount.Fiat
                  value={bnOrZero(opportunityData?.rewardsCryptoBaseUnit?.amounts[0] ?? 0)
                    .div(bn(10).pow(asset.precision))
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
        ),
        disableSortBy: true,
      },
    ],
    [asset.precision, asset.symbol, marketData.price],
  )

  if (userStakingOpportunities.length === 0) return null

  return (
    <Card>
      <Card.Header flexDir='row' display='flex'>
        <HStack justify='space-between' flex={1}>
          <Card.Heading>
            <Text translation='staking.staking' />
          </Card.Heading>

          <Button
            size='sm'
            variant='link'
            colorScheme='blue'
            as={NavLink}
            to='/defi/earn'
            rightIcon={<ArrowForwardIcon />}
          >
            <Text translation='common.seeAll' />
          </Button>
        </HStack>
      </Card.Header>
      <Card.Body pt={0} px={2}>
        <ReactTable
          data={userStakingOpportunities}
          columns={columns}
          displayHeaders={isActive}
          onRowClick={handleClick}
        />
      </Card.Body>
    </Card>
  )
}
