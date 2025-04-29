import { Card, CardBody, CardHeader, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import { useState } from 'react'

import { TCYTabIndex } from '../types'

import { FormHeader } from '@/components/FormHeader'

const FormHeaderItems = [
  { label: 'TCY.stake', index: TCYTabIndex.Stake },
  { label: 'TCY.unstake', index: TCYTabIndex.Unstake },
  { label: 'TCY.claim', index: TCYTabIndex.Claim },
]

export const Widget = () => {
  const [stepIndex, setStepIndex] = useState(TCYTabIndex.Stake)

  return (
    <Card>
      <CardHeader>
        <FormHeader items={FormHeaderItems} setStepIndex={setStepIndex} activeIndex={stepIndex} />
      </CardHeader>
      <CardBody>
        <Tabs index={stepIndex}>
          <TabPanels>
            <TabPanel>
              <p>Stake</p>
            </TabPanel>
            <TabPanel>
              <p>Unstake</p>
            </TabPanel>
            <TabPanel>
              <p>Claim</p>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </CardBody>
    </Card>
  )
}
