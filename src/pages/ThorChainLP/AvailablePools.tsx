import type { FlexProps, GridProps } from '@chakra-ui/react'
import { Flex, Skeleton, Spinner, Stack, Tag, TagLeftIcon } from '@chakra-ui/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useIsTradingActive } from 'react-queries/hooks/useIsTradingActive'
import { generatePath, useHistory } from 'react-router'
import type { Column, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { CircleIcon } from 'components/Icons/Circle'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { RawText, Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

import { PoolIcon } from './components/PoolIcon'
import { PoolsHeader } from './components/PoolsHeader'
import type { Pool } from './queries/hooks/usePools'
import { usePools } from './queries/hooks/usePools'

export const lendingRowGrid: GridProps['gridTemplateColumns'] = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  lg: '1fr repeat(2, 1fr)',
  xl: '1fr repeat(3, minmax(200px, max-content))',
}
const mobileDisplay = {
  base: 'none',
  lg: 'flex',
}

const poolDetailsDirection: FlexProps['flexDirection'] = {
  base: 'column',
  md: 'row',
}

const stackPadding = { base: 2, md: 0 }

const reactTableInitialState = { sortBy: [{ id: 'tvlFiat', desc: true }], pageSize: 5000 }

type RowProps = Row<Pool>

export const AvailablePools = () => {
  const history = useHistory()
  const { data: pools } = usePools()
  const translate = useTranslate()

  const headerComponent = useMemo(() => <PoolsHeader />, [])

  const columns: Column<Pool>[] = useMemo(
    () => [
      {
        Header: translate('pools.pool'),
        accessor: 'name',
        Cell: ({ row, value }: { value: string; row: RowProps }) => {
          const pool = row.original

          const { isTradingActive, isLoading: isTradingActiveLoading } = useIsTradingActive({
            assetId: pool?.assetId,
            swapperName: SwapperName.Thorchain,
          })

          const isThorchainLpDepositEnabled = useFeatureFlag('ThorchainLpDeposit')
          const isThorchainLpWithdrawEnabled = useFeatureFlag('ThorchainLpWithdraw')
          const isThorchainLpInteractionDisabled =
            !isThorchainLpDepositEnabled && !isThorchainLpWithdrawEnabled

          const statusContent = useMemo(() => {
            switch (true) {
              case isTradingActive === false:
                return {
                  color: 'red.500',
                  element: <Text translation='common.halted' />,
                }
              case isThorchainLpInteractionDisabled:
                return {
                  color: 'red.500',
                  element: <Text translation='common.disabled' />,
                }
              case isTradingActive === true && pool.status === 'available':
                return {
                  color: 'green.500',
                  element: <Amount.Percent value={pool.annualPercentageRate} suffix='APY' />,
                }
              case isTradingActive === true && pool.status === 'staged':
                return {
                  color: 'yellow.500',
                  element: <Text translation='common.staged' />,
                }
              default:
                return {
                  color: 'text.subtle',
                  element: <Amount.Percent value={pool.annualPercentageRate} />,
                }
            }
          }, [
            isThorchainLpInteractionDisabled,
            isTradingActive,
            pool.annualPercentageRate,
            pool.status,
          ])

          const poolAssetIds = useMemo(() => [pool.assetId, thorchainAssetId], [pool.assetId])
          return (
            <Skeleton isLoaded={!!value}>
              <Flex gap={4} alignItems='center'>
                <PoolIcon assetIds={poolAssetIds} size='sm' />
                <Flex gap={2} flexDir={poolDetailsDirection} flex='0 1 auto'>
                  <RawText fontWeight='semibold'>{pool.name}</RawText>
                  <Skeleton isLoaded={!isTradingActiveLoading}>
                    <Tag size='sm'>
                      <TagLeftIcon as={CircleIcon} boxSize='8px' color={statusContent.color} />
                      {statusContent.element}
                    </Tag>
                  </Skeleton>
                </Flex>
              </Flex>
            </Skeleton>
          )
        },
      },
      {
        Header: translate('pools.tvl'),
        accessor: 'tvlFiat',
        justifyContent: { base: 'flex-end', md: 'flex-start' },
        textAlign: { base: 'right', md: 'left' },
        Cell: ({ value }: { value: string; row: RowProps }) => {
          return (
            <Skeleton isLoaded={!!value}>
              <Amount.Fiat value={value} />
            </Skeleton>
          )
        },
      },
      {
        Header: translate('pools.volume24h'),
        accessor: 'volume24hFiat',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ value: volume24hFiat }: { value: string | undefined; row: RowProps }) => (
          <Skeleton isLoaded={!!volume24hFiat}>
            <Skeleton isLoaded={!!volume24hFiat} display={mobileDisplay}>
              <Amount.Fiat value={volume24hFiat ?? '0'} />
            </Skeleton>
          </Skeleton>
        ),
      },
      {
        Header: translate('pools.volume7d'),
        accessor: 'volume7dFiat',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ value: volume7dFiat }: { value: string | undefined; row: RowProps }) => {
          return (
            <Skeleton isLoaded={!!volume7dFiat}>
              <Skeleton isLoaded={!!volume7dFiat} display={mobileDisplay}>
                <Amount.Fiat value={volume7dFiat ?? '0'} />
              </Skeleton>
            </Skeleton>
          )
        },
      },
    ],
    [translate],
  )

  const handlePoolClick = useCallback(
    ({ original: pool }: Row<Pool>) => {
      history.push(generatePath('/pools/:poolAssetId', { poolAssetId: pool.asset }))
    },
    [history],
  )

  return (
    <Main headerComponent={headerComponent} isSubPage>
      <SEO title={translate('navBar.pools')} />
      <Stack px={stackPadding}>
        {pools.length ? (
          <ReactTable
            data={pools}
            columns={columns}
            initialState={reactTableInitialState}
            onRowClick={handlePoolClick}
            variant='clickable'
          />
        ) : (
          <Flex gap={4} alignItems='center' justifyContent='center'>
            <Spinner />
          </Flex>
        )}
      </Stack>
    </Main>
  )
}
