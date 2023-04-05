import { Stack } from '@chakra-ui/react'
import { Card } from 'components/Card/Card'
import { MaybeChartUnavailable } from 'components/MaybeChartUnavailable'
import { Text } from 'components/Text'
import { EligibleCarousel } from 'pages/Defi/components/EligibleCarousel'
import { selectPortfolioAssetIds } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AccountTable } from './components/AccountList/AccountTable'
import { PortfolioBreakdown } from './PortfolioBreakdown'

export const Portfolio = () => {
  const assetIds = useAppSelector(selectPortfolioAssetIds)

  return (
    <Stack spacing={6} width='full'>
      <MaybeChartUnavailable assetIds={assetIds} />
      <PortfolioBreakdown />
      <EligibleCarousel display={{ base: 'flex', md: 'none' }} />
      <Card>
        <Card.Header>
          <Card.Heading>
            <Text translation='dashboard.portfolio.yourAssets' />
          </Card.Heading>
        </Card.Header>
        <Card.Body px={2} pt={0}>
          <AccountTable />
        </Card.Body>
      </Card>
    </Stack>
  )
}
