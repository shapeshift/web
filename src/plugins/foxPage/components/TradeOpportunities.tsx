import { Box, Flex, Link } from '@chakra-ui/layout'
import { Text as CText } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text/Text'

const opportunitiesBuckets: TradeOpportunitiesBucket[] = [
  {
    title: 'plugins.foxPage.dex',
    opportunities: [
      {
        link: 'https://app.uniswap.org/',
        icon: 'https://uniswap.org/static/img/logo.svg',
      },
      {
        link: 'https://app.uniswap.org/',
        icon: 'https://uniswap.org/static/img/logo.svg',
      },
    ],
  },
  {
    title: 'plugins.foxPage.centralized',
    opportunities: [
      {
        link: 'https://app.uniswap.org/',
        icon: 'https://uniswap.org/static/img/logo.svg',
      },
      {
        link: 'https://app.uniswap.org/',
        icon: 'https://uniswap.org/static/img/logo.svg',
      },
    ],
  },
]

type TradeOpportunity = {
  link: string
  icon: string
}

type TradeOpportunitiesBucket = {
  title: string
  opportunities: TradeOpportunity[]
}

export const TradeOpportunities = () => {
  const translate = useTranslate()

  return (
    <Card display='block' width='full'>
      <Card.Header pb={0}>
        <CText fontWeight='bold' color='inherit'>
          {translate('plugins.foxPage.availableToTradeOn')}
        </CText>
      </Card.Header>
      <Card.Body>
        {opportunitiesBuckets.map(bucket => (
          <Box my={2}>
            <Text translation={bucket.title} color='gray.500' fontWeight='semibold' mb={4} />
            <Flex flexDirection='row' flexWrap='wrap' m={-2}>
              {bucket.opportunities.map(opportunity => (
                <Link href={opportunity.link}>
                  <AssetIcon src={opportunity.icon} boxSize='8' m={2} />
                </Link>
              ))}
            </Flex>
          </Box>
        ))}
      </Card.Body>
    </Card>
  )
}
