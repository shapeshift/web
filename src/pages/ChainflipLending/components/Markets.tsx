import type { GridProps } from '@chakra-ui/react'
import {
  Button,
  CircularProgress,
  Flex,
  HStack,
  SimpleGrid,
  Skeleton,
  Stack,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { AssetCell } from '@/components/StakingVaults/Cells'
import { Text } from '@/components/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { permillToDecimal } from '@/lib/chainflip/utils'
import { ChainflipLendingHeader } from '@/pages/ChainflipLending/components/ChainflipLendingHeader'
import type { ChainflipLendingPoolWithFiat } from '@/pages/ChainflipLending/hooks/useChainflipLendingPools'
import { useChainflipLendingPools } from '@/pages/ChainflipLending/hooks/useChainflipLendingPools'

const marketRowGrid: GridProps['gridTemplateColumns'] = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  md: '200px repeat(4, 1fr)',
}

const mobileDisplay = { base: 'none', md: 'flex' }
const mobilePadding = { base: 4, lg: 4, xl: 0 }
const listMargin = { base: 0, lg: 0, xl: -4 }

type MarketRowProps = {
  pool: ChainflipLendingPoolWithFiat
  onViewMarket: (assetId: AssetId) => void
}

const MarketRow = ({ pool, onViewMarket }: MarketRowProps) => {
  const handleClick = useCallback(() => {
    if (pool.assetId) onViewMarket(pool.assetId)
  }, [pool.assetId, onViewMarket])

  const utilisationPercent = useMemo(
    () => permillToDecimal(pool.pool.utilisation_rate),
    [pool.pool.utilisation_rate],
  )

  const utilisationNumber = useMemo(
    () => bnOrZero(utilisationPercent).times(100).toNumber(),
    [utilisationPercent],
  )

  const utilisationColor = useMemo(() => {
    if (utilisationNumber >= 90) return 'red.400'
    if (utilisationNumber >= 70) return 'orange.400'
    return 'blue.400'
  }, [utilisationNumber])

  if (!pool.assetId) return null

  return (
    <Button
      variant='ghost'
      display='grid'
      gridTemplateColumns={marketRowGrid}
      columnGap={4}
      alignItems='center'
      textAlign='left'
      py={4}
      width='full'
      height='auto'
      color='text.base'
      onClick={handleClick}
    >
      <AssetCell assetId={pool.assetId} />
      <Flex display={mobileDisplay}>
        <Amount.Fiat value={pool.totalAmountFiat} />
      </Flex>
      <Flex display={mobileDisplay}>
        <Amount.Percent value={pool.supplyApy} autoColor />
      </Flex>
      <Flex display={mobileDisplay}>
        <Amount.Fiat
          value={bnOrZero(pool.totalAmountFiat).minus(pool.availableAmountFiat).toFixed(2)}
        />
      </Flex>
      <HStack spacing={2}>
        <CircularProgress
          value={utilisationNumber}
          size='24px'
          thickness='10px'
          color={utilisationColor}
          trackColor='whiteAlpha.100'
        />
        <Amount.Percent value={utilisationPercent} />
      </HStack>
    </Button>
  )
}

export const Markets = () => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const { pools, isLoading } = useChainflipLendingPools()

  const handleViewMarket = useCallback(
    (assetId: AssetId) => {
      navigate(`/chainflip-lending/pool/${assetId}`)
    },
    [navigate],
  )

  const headerComponent = useMemo(() => <ChainflipLendingHeader />, [])

  const sortedPools = useMemo(
    () => [...pools].sort((a, b) => bnOrZero(b.supplyApy).minus(a.supplyApy).toNumber()),
    [pools],
  )

  const marketRows = useMemo(() => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={16} />)
    }

    return sortedPools.map(pool =>
      pool.assetId ? (
        <MarketRow key={pool.assetId} pool={pool} onViewMarket={handleViewMarket} />
      ) : null,
    )
  }, [isLoading, sortedPools, handleViewMarket])

  return (
    <Main headerComponent={headerComponent} isSubPage>
      <SEO title='Chainflip Lending' />
      <Stack>
        <SimpleGrid
          gridTemplateColumns={marketRowGrid}
          columnGap={4}
          color='text.subtle'
          fontWeight='bold'
          fontSize='sm'
          px={mobilePadding}
        >
          <Text translation='chainflipLending.pool' />
          <Flex display={mobileDisplay}>
            <HelperTooltip label={translate('chainflipLending.totalSuppliedTooltip')}>
              <Text translation='chainflipLending.totalSupplied' />
            </HelperTooltip>
          </Flex>
          <Flex display={mobileDisplay}>
            <HelperTooltip label={translate('chainflipLending.supplyApyTooltip')}>
              <Text translation='chainflipLending.supplyApy' />
            </HelperTooltip>
          </Flex>
          <Flex display={mobileDisplay}>
            <HelperTooltip label={translate('chainflipLending.totalBorrowedTooltip')}>
              <Text translation='chainflipLending.totalBorrowed' />
            </HelperTooltip>
          </Flex>
          <HelperTooltip label={translate('chainflipLending.utilisationTooltip')}>
            <Text translation='chainflipLending.utilisation' />
          </HelperTooltip>
        </SimpleGrid>
        <Stack mx={listMargin}>{marketRows}</Stack>
      </Stack>
    </Main>
  )
}
