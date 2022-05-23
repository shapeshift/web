import { Flex } from '@chakra-ui/layout'
import { Accordion, Text as CText } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text/Text'

import { OpportunityTypeTitles, otherOpportunitiesChunks } from '../../FoxCommon'
import { FoxOtherOpportunityPanel } from './FoxOtherOpportunityPanel'

type OtherOpportunitiesProps = {
  description: string
}

export const OtherOpportunities: React.FC<OtherOpportunitiesProps> = ({ description }) => {
  const translate = useTranslate()

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
          {otherOpportunitiesChunks.map(opportunities => {
            if (!opportunities.length) return null

            return (
              <FoxOtherOpportunityPanel
                opportunities={opportunities}
                title={OpportunityTypeTitles[opportunities[0].type]}
              />
            )
          })}
        </Accordion>
      </Card.Body>
    </Card>
  )
}
