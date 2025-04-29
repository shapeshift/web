import { Card, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import { useMemo, useState } from 'react'

import { ChangeAddress } from './components/ChangeAddress/ChangeAddress'
import { Claim } from './components/Claim/Claim'
import { Stake } from './components/Stake/Stake'
import { Unstake } from './components/Unstake/Unstake'

import { FormHeader } from '@/components/FormHeader'

export const RfoxTabIndex = {
  Stake: 0,
  Unstake: 1,
  Claim: 2,
  ChangeAddress: 3,
}

const FormHeaderItems = [
  { label: 'RFOX.stake', index: RfoxTabIndex.Stake },
  { label: 'RFOX.unstake', index: RfoxTabIndex.Unstake },
  { label: 'RFOX.claim', index: RfoxTabIndex.Claim },
  { label: 'RFOX.changeAddress', index: RfoxTabIndex.ChangeAddress },
]

export const Widget: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(RfoxTabIndex.Stake)

  const TabHeader = useMemo(
    () => (
      <FormHeader items={FormHeaderItems} setStepIndex={setStepIndex} activeIndex={stepIndex} />
    ),
    [stepIndex],
  )

  return (
    <Card width='full'>
      <Tabs variant='unstyled' index={stepIndex} isLazy>
        <TabPanels>
          <TabPanel px={0} py={0}>
            <Stake headerComponent={TabHeader} setStepIndex={setStepIndex} />
          </TabPanel>
          <TabPanel px={0} py={0}>
            <Unstake headerComponent={TabHeader} />
          </TabPanel>
          <TabPanel px={0} py={0}>
            <Claim headerComponent={TabHeader} setStepIndex={setStepIndex} />
          </TabPanel>
          <TabPanel px={0} py={0}>
            <ChangeAddress headerComponent={TabHeader} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Card>
  )
}
