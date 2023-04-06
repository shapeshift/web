import { Stack, Tab, TabList, TabPanel, TabPanels, Tabs, Tag } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { MaybeChartUnavailable } from 'components/MaybeChartUnavailable'
import { NftTable } from 'components/Nfts/NftTable'
import { RawText, Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { EligibleCarousel } from 'pages/Defi/components/EligibleCarousel'
import { selectPortfolioAssetIds } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AccountTable } from './components/AccountList/AccountTable'
import { PortfolioBreakdown } from './PortfolioBreakdown'
import { PortfolioChart } from './PortfolioChart'

export const Portfolio = () => {
  const isNftsEnabled = useFeatureFlag('Jaypegz')
  const translate = useTranslate()
  const assetIds = useAppSelector(selectPortfolioAssetIds)

  return (
    <Stack spacing={6} width='full'>
      <PortfolioChart />
      <MaybeChartUnavailable assetIds={assetIds} />
      <PortfolioBreakdown />
      <EligibleCarousel display={{ base: 'flex', md: 'none' }} />
      <Card>
        <Tabs isLazy variant='unstyled'>
          <Card.Header px={2}>
            <TabList>
              <Tab
                color='gray.500'
                _selected={{ color: 'chakra-body-text' }}
                _hover={{ color: 'chakra-body-text' }}
              >
                <Card.Heading>
                  <Text translation='dashboard.portfolio.yourAssets' />
                </Card.Heading>
              </Tab>
              {isNftsEnabled && (
                <Tab
                  color='gray.500'
                  _selected={{ color: 'chakra-body-text' }}
                  _hover={{ color: 'chakra-body-text' }}
                >
                  <Card.Heading display='flex' gap={2} alignItems='center'>
                    <RawText>NFTs</RawText>
                    <Tag
                      colorScheme='pink'
                      size='sm'
                      fontSize='xs'
                      fontWeight='bold'
                      lineHeight={1}
                    >
                      {translate('common.new')}
                    </Tag>
                  </Card.Heading>
                </Tab>
              )}
            </TabList>
          </Card.Header>
          <TabPanels>
            <TabPanel px={2} pt={0}>
              <AccountTable />
            </TabPanel>
            {isNftsEnabled && (
              <TabPanel px={6} pt={0}>
                <NftTable />
              </TabPanel>
            )}
          </TabPanels>
        </Tabs>
      </Card>
    </Stack>
  )
}
