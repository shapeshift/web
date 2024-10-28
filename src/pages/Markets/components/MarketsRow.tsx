import { ArrowBackIcon } from '@chakra-ui/icons'
import type { FlexProps } from '@chakra-ui/react'
import { Box, Flex, Heading, IconButton, Text } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Link, useHistory, useParams } from 'react-router-dom'
import { ChainDropdown } from 'components/ChainDropdown/ChainDropdown'
import { OrderDropdown } from 'components/OrderDropdown/OrderDropdown'
import { OrderOptionsKeys } from 'components/OrderDropdown/types'
import { SortDropdown } from 'components/SortDropdown/SortDropdown'
import { SortOptionsKeys } from 'components/SortDropdown/types'
import { selectFeatureFlag } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { type MARKETS_CATEGORIES, sortOptionsByCategory } from '../constants'
import type { RowProps } from '../hooks/useRows'

const flexAlign = { base: 'flex-start', md: 'flex-end' }
const flexDirection: FlexProps['flexDir'] = { base: 'column', md: 'row' }

type MarketsRowProps = {
  title?: string
  subtitle?: string
  supportedChainIds: ChainId[] | undefined
  category?: MARKETS_CATEGORIES
  showSparkline?: boolean
  showOrderFilter?: boolean
  showSortFilter?: boolean
  children: (props: RowProps) => React.ReactNode
}

const backIcon = <ArrowBackIcon />

export const MarketsRow: React.FC<MarketsRowProps> = ({
  title,
  subtitle,
  supportedChainIds,
  children,
  category,
  showSparkline,
  showOrderFilter,
  showSortFilter,
}) => {
  const params: { category?: MARKETS_CATEGORIES } = useParams()
  const translate = useTranslate()
  const history = useHistory()
  const handleBack = history.goBack
  const isCategoryRoute = params.category
  const [selectedChainId, setSelectedChainId] = useState<ChainId | undefined>(undefined)
  const [selectedOrder, setSelectedOrder] = useState<OrderOptionsKeys>(OrderOptionsKeys.DESCENDING)
  const [selectedSort, setSelectedSort] = useState<SortOptionsKeys>(SortOptionsKeys.PRICE_CHANGE)
  const isArbitrumNovaEnabled = useAppSelector(state => selectFeatureFlag(state, 'ArbitrumNova'))

  const chainIds = useMemo(() => {
    if (!supportedChainIds)
      return Object.values(KnownChainIds).filter(chainId => {
        if (!isArbitrumNovaEnabled && chainId === KnownChainIds.ArbitrumNovaMainnet) return false
        return true
      })

    return supportedChainIds
  }, [isArbitrumNovaEnabled, supportedChainIds])

  const Title = useMemo(() => {
    if (!title) return null

    if (isCategoryRoute) {
      return <Heading>{title}</Heading>
    }

    return (
      <Heading size={'md'} mb={2}>
        {category ? <Link to={`/markets/category/${category}`}>{title}</Link> : title}
      </Heading>
    )
  }, [category, isCategoryRoute, title])

  const Subtitle = useMemo(() => {
    if (!subtitle) return null

    if (isCategoryRoute) {
      return (
        <Text color='text.subtle' mt={2}>
          {subtitle}
        </Text>
      )
    }

    return (
      <Text fontSize='sm' color='text.subtle'>
        {subtitle}
      </Text>
    )
  }, [isCategoryRoute, subtitle])

  const childrenProps = useMemo(() => {
    return {
      orderBy: showOrderFilter ? selectedOrder : undefined,
      sortBy: showSortFilter ? selectedSort : undefined,
    }
  }, [selectedOrder, selectedSort, showOrderFilter, showSortFilter])

  return (
    <Box mb={12}>
      <Flex
        justify='space-between'
        align={flexAlign}
        flexDir={flexDirection}
        pb={isCategoryRoute && 6}
        mb={isCategoryRoute ? 12 : 4}
        borderBottomWidth={isCategoryRoute && 1}
        borderColor={isCategoryRoute && 'border.base'}
        gap={isCategoryRoute ? 8 : 4}
      >
        <Box me={4}>
          <Flex direction='row' align='center'>
            {isCategoryRoute && (
              <IconButton aria-label='back' onClick={handleBack} icon={backIcon} mr={4} />
            )}
            {Title}
          </Flex>
          {Subtitle}
        </Box>
        <Flex alignItems='center' mx={-2}>
          {showSortFilter && params.category ? (
            <SortDropdown
              options={sortOptionsByCategory[params.category] ?? []}
              value={selectedSort}
              onClick={setSelectedSort}
            />
          ) : null}
          {showOrderFilter ? (
            <OrderDropdown value={selectedOrder} onClick={setSelectedOrder} />
          ) : null}
          <Flex alignItems='center' mx={2}>
            <Text me={4}>{translate('common.filterBy')}</Text>
            <ChainDropdown
              chainIds={chainIds}
              chainId={selectedChainId}
              onClick={setSelectedChainId}
              showAll
              includeBalance
            />
          </Flex>
        </Flex>
      </Flex>
      {children({ selectedChainId, showSparkline, ...childrenProps })}
    </Box>
  )
}
