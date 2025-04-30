import { Card, CardBody, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import { useMemo, useState } from 'react'

import { TCYTabIndex } from '../types'
import { Claim } from './Claim/Claim'
import { Stake } from './Stake/Stake'

import { FormHeader } from '@/components/FormHeader'

const FormHeaderItems = [
  { label: 'TCY.claim', index: TCYTabIndex.Claim },
  { label: 'TCY.stake', index: TCYTabIndex.Stake },
  { label: 'TCY.unstake', index: TCYTabIndex.Unstake },
]

export const Widget = () => {
  const [stepIndex, setStepIndex] = useState(TCYTabIndex.Claim)

  const TabHeader = useMemo(() => {
    return (
      <FormHeader items={FormHeaderItems} setStepIndex={setStepIndex} activeIndex={stepIndex} />
    )
  }, [stepIndex, setStepIndex])

  return (
    <Card>
      <CardBody px={0} py={0}>
        <Tabs index={stepIndex}>
          <TabPanels>
            <TabPanel p={0}>
              <Claim headerComponent={TabHeader} />
            </TabPanel>
            <TabPanel>
              <Stake headerComponent={TabHeader} />
            </TabPanel>
            <TabPanel>
              <p>Unstake</p>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </CardBody>
    </Card>
  )
}
