import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, HStack, Skeleton, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId, ChainId } from '@keepkey/caip'
import { cosmosChainId, fromAssetId, osmosisChainId } from '@keepkey/caip'
import { chainIdToLabel } from 'features/defi/helpers/utils'
import { AprTag } from 'plugins/cosmos/components/AprTag/AprTag'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { NavLink, useHistory } from 'react-router-dom'
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
  selectStakingOpportunitiesDataFullByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type StakingOpportunitiesProps = {
  accountId?: AccountId
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

export const StakingOpportunities = ({ assetId, accountId }: StakingOpportunitiesProps) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const history = useHistory()
  const filter = useMemo(() => ({ assetId, accountId: accountId ?? '' }), [assetId, accountId])

  // this is returning data grouped by validator, not by account
  const stakingOpportunitiesData = useAppSelector(s =>
    selectStakingOpportunitiesDataFullByFilter(s, filter),
  )
  const hasActiveStaking = useAppSelector(state => selectHasActiveStakingOpportunity(state, filter))

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
    [asset?.chainId, asset.precision, asset.symbol, marketData.price],
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
          data={stakingOpportunitiesData}
          columns={columns}
          displayHeaders={hasActiveStaking}
          onRowClick={handleClick}
        />
      </Card.Body>
    </Card>
  )
}
