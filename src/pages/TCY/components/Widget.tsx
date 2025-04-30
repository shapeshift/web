import { Card, CardBody, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import { useMemo, useState } from 'react'

import { TCYTabIndex } from '../types'
import { Stake } from './Stake/Stake'
import { Unstake } from './Unstake/Unstake'

import { FormHeader } from '@/components/FormHeader'

const FormHeaderItems = [
  { label: 'TCY.stake', index: TCYTabIndex.Stake },
  { label: 'TCY.unstake', index: TCYTabIndex.Unstake },
]

export const Widget = () => {
  const [stepIndex, setStepIndex] = useState(TCYTabIndex.Stake)

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
              <Stake headerComponent={TabHeader} />
            </TabPanel>
            <TabPanel p={0}>
              <Unstake headerComponent={TabHeader} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </CardBody>
    </Card>
  )
}
