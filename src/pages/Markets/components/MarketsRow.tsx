import { ArrowBackIcon } from '@chakra-ui/icons'
import { Box, Flex, Heading, IconButton, Text } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useMemo, useState } from 'react'
import { Link, useHistory, useParams } from 'react-router-dom'
import { ChainDropdown } from 'components/ChainDropdown/ChainDropdown'
import { selectFeatureFlag } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { MARKETS_CATEGORIES } from '../constants'

type RowProps = {
  title: string
  subtitle?: string
  supportedChainIds: ChainId[] | undefined
  category: MARKETS_CATEGORIES
  children: (selectedChainId: ChainId | undefined) => React.ReactNode
}

const backIcon = <ArrowBackIcon />

export const MarketsRow: React.FC<RowProps> = ({
  title,
  subtitle,
  supportedChainIds,
  children,
  category,
}) => {
  const params: { category?: MARKETS_CATEGORIES } = useParams()
  const history = useHistory()
  const handleBack = history.goBack
  const isCategoryRoute = params.category
  const [selectedChainId, setSelectedChainId] = useState<ChainId | undefined>(undefined)
  const isArbitrumNovaEnabled = useAppSelector(state => selectFeatureFlag(state, 'ArbitrumNova'))

  const chainIds = useMemo(() => {
    if (!supportedChainIds)
      return Object.values(KnownChainIds).filter(chainId => {
        if (!isArbitrumNovaEnabled && chainId === KnownChainIds.ArbitrumNovaMainnet) return false
        return true
      })

    return supportedChainIds
  }, [isArbitrumNovaEnabled, supportedChainIds])

  return (
    <Box mb={8}>
      <Flex justify='space-between' align='center' mb={4}>
        <Box me={4}>
          <Flex direction='row'>
            {isCategoryRoute && (
              <IconButton variant='ghost' aria-label='back' onClick={handleBack} icon={backIcon} />
            )}
            <Heading size='md' mb={1}>
              <Link to={`/markets/category/${category}`}>{title}</Link>
            </Heading>
          </Flex>
          {subtitle && (
            <Text fontSize='sm' color='gray.500'>
              {subtitle}
            </Text>
          )}
        </Box>
        <ChainDropdown
          chainIds={chainIds}
          chainId={selectedChainId}
          onClick={setSelectedChainId}
          showAll
          includeBalance
        />
      </Flex>
      {children(selectedChainId)}
    </Box>
  )
}
