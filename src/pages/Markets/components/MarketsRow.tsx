import { ArrowBackIcon, ArrowForwardIcon, ChevronDownIcon } from '@chakra-ui/icons'
import type { FlexProps } from '@chakra-ui/react'
import {
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  Text,
  useMediaQuery,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Link, useHistory, useParams } from 'react-router-dom'
import { ChainDropdown } from 'components/ChainDropdown/ChainDropdown'
import { OrderDropdown } from 'components/OrderDropdown/OrderDropdown'
import { OrderDirection } from 'components/OrderDropdown/types'
import { SortDropdown } from 'components/SortDropdown/SortDropdown'
import { SortOptionsKeys } from 'components/SortDropdown/types'
import { selectFeatureFlag } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import type { MarketsCategories } from '../constants'
import { sortOptionsByCategory } from '../constants'
import type { RowProps } from '../hooks/useRows'

const chevronDownIcon = <ChevronDownIcon />
const arrowForwardIcon = <ArrowForwardIcon />

const flexAlign = { base: 'flex-start', md: 'flex-end' }
const flexDirection: FlexProps['flexDir'] = { base: 'column', md: 'row' }

const colWidth = { base: 'auto', lg: 'max-content' }
const colMinWidth = { base: '50%', lg: 'auto' }
const chainButtonProps = {
  width: colWidth,
  minWidth: colMinWidth,
  my: { base: 2, lg: 0 },
}
const headerMx = { base: 0, xl: -2 }

type MarketsRowProps = {
  title?: string
  subtitle?: string
  supportedChainIds: ChainId[] | undefined
  category?: MarketsCategories
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
  const params: { category?: MarketsCategories } = useParams()
  const translate = useTranslate()
  const history = useHistory()
  const handleBack = history.goBack
  const isCategoryRoute = params.category
  const [selectedChainId, setSelectedChainId] = useState<ChainId | undefined>(undefined)
  const [selectedOrder, setSelectedOrder] = useState<OrderDirection>(OrderDirection.Descending)
  const [selectedSort, setSelectedSort] = useState<SortOptionsKeys>(
    (params.category && sortOptionsByCategory[params.category]?.[0]) ?? SortOptionsKeys.Volume,
  )
  const isArbitrumNovaEnabled = useAppSelector(state => selectFeatureFlag(state, 'ArbitrumNova'))
  const [isSmallerThanLg] = useMediaQuery(`(max-width: ${breakpoints.lg})`)

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
        {category ? (
          <Button
            as={Link}
            to={`/markets/category/${category}`}
            rightIcon={arrowForwardIcon}
            fontSize='inherit'
            variant='link'
          >
            {title}
          </Button>
        ) : (
          title
        )}
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
        <Flex alignItems='center' mx={headerMx} alignSelf='flex-end'>
          {params.category && isSmallerThanLg ? (
            <Menu>
              <MenuButton as={Button} rightIcon={chevronDownIcon}>
                {translate('common.filterAndSort')}
              </MenuButton>
              <MenuList zIndex='banner' minWidth='340px' px={2}>
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
                <Flex alignItems='center' justifyContent='space-between' mx={2}>
                  <Text width={colWidth} me={4}>
                    {translate('common.filterBy')}
                  </Text>
                  <ChainDropdown
                    chainIds={chainIds}
                    chainId={selectedChainId}
                    onClick={setSelectedChainId}
                    showAll
                    includeBalance
                    buttonProps={chainButtonProps}
                  />
                </Flex>
              </MenuList>
            </Menu>
          ) : null}

          {showSortFilter && params.category && !isSmallerThanLg ? (
            <SortDropdown
              options={sortOptionsByCategory[params.category] ?? []}
              value={selectedSort}
              onClick={setSelectedSort}
            />
          ) : null}
          {showOrderFilter && !isSmallerThanLg ? (
            <OrderDropdown value={selectedOrder} onClick={setSelectedOrder} />
          ) : null}
          {!isSmallerThanLg ? (
            <Flex alignItems='center' mx={2}>
              <Text me={4} width='max-content'>
                {translate('common.filterBy')}
              </Text>
              <ChainDropdown
                chainIds={chainIds}
                chainId={selectedChainId}
                onClick={setSelectedChainId}
                showAll
                includeBalance
              />
            </Flex>
          ) : null}
        </Flex>
      </Flex>
      {children({ selectedChainId, showSparkline, ...childrenProps })}
    </Box>
  )
}
