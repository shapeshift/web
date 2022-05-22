import { Flex } from '@chakra-ui/layout'
import { Accordion, Text as CText } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text/Text'

import { FoxOpportunities } from '../../FoxCommon'
import { FoxOtherOpportunityPanel } from './FoxOtherOpportunityPanel'

type OtherOpportunitiesProps = {
  description: string
  opportunities: FoxOpportunities
}

export const OtherOpportunities: React.FC<OtherOpportunitiesProps> = ({
  description,
  opportunities,
}) => {
  const translate = useTranslate()
  const hasLiquidityPools = opportunities.liquidityPools?.length
  const hasFarming = opportunities.farming?.length
  const hasBorrowingAndLending = opportunities.borrowingAndLending?.length

  return (
    <Card display='block' width='full' borderRadius={8}>
      <Card.Header pb={0}>
        <Flex flexDirection='row' alignItems='center' mb={2}>
          <CText fontWeight='bold' color='inherit'>
            {translate('plugins.foxPage.otherOpportunitiesTitle')}
          </CText>
        </Flex>
        <Text translation={description} color='gray.500' />
      </Card.Header>
      <Card.Body pb={0}>
        <Accordion mx={-6} defaultIndex={[0]} allowToggle allowMultiple>
          {hasLiquidityPools && (
            <FoxOtherOpportunityPanel
              opportunities={opportunities.liquidityPools}
              title='plugins.foxPage.liquidityPools'
            />
          )}
          {hasFarming && (
            <FoxOtherOpportunityPanel
              opportunities={opportunities.farming}
              title='plugins.foxPage.farming'
            />
          )}
          {hasBorrowingAndLending && (
            <FoxOtherOpportunityPanel
              opportunities={opportunities.borrowingAndLending}
              title='plugins.foxPage.borrowingAndLending'
            />
          )}
        </Accordion>
      </Card.Body>
    </Card>
  )
}
