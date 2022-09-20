import { Flex } from '@chakra-ui/layout'
import { Accordion } from '@chakra-ui/react'
import type { OpportunitiesBucket } from 'plugins/foxPage/FoxCommon'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text/Text'

import { FoxOtherOpportunityPanel } from './FoxOtherOpportunityPanel'

type OtherOpportunitiesProps = {
  title: string
  description: string
  opportunities: OpportunitiesBucket[]
}

export const OtherOpportunities: React.FC<OtherOpportunitiesProps> = ({
  title,
  description,
  opportunities,
}) => {
  return (
    <Card display='block' width='full' borderRadius={8}>
      <Card.Header pb={0}>
        <Flex flexDirection='row' alignItems='center' mb={2}>
          <Text translation={title} fontWeight='bold' color='inherit' />
        </Flex>
        <Text translation={description} color='gray.500' />
      </Card.Header>
      <Card.Body pb={0}>
        <Accordion mx={-6} defaultIndex={[0]} allowToggle allowMultiple>
          {opportunities.map(opportunitiesBucket => {
            const { opportunities } = opportunitiesBucket
            if (!opportunities.length || opportunities.every(opportunity => opportunity.isDisabled))
              return null

            return (
              <FoxOtherOpportunityPanel
                key={opportunitiesBucket.type}
                opportunities={opportunities}
                title={opportunitiesBucket.title}
                type={opportunitiesBucket.type}
              />
            )
          })}
        </Accordion>
      </Card.Body>
    </Card>
  )
}
