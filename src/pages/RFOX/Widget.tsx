import { Card, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom'

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
  const location = useLocation()
  const navigate = useNavigate()

  // Compute step index directly from route
  const stepIndex = useMemo(() => {
    const path = location.pathname
    if (path.includes('/stake')) {
      return RfoxTabIndex.Stake
    } else if (path.includes('/unstake')) {
      return RfoxTabIndex.Unstake
    } else if (path.includes('/claim')) {
      return RfoxTabIndex.Claim
    } else if (path.includes('/change-address')) {
      return RfoxTabIndex.ChangeAddress
    }
    return RfoxTabIndex.Stake // default
  }, [location.pathname])

  // Handle tab navigation
  const handleTabChange = (index: number) => {
    switch (index) {
      case RfoxTabIndex.Stake:
        navigate('/rfox/stake')
        break
      case RfoxTabIndex.Unstake:
        navigate('/rfox/unstake')
        break
      case RfoxTabIndex.Claim:
        navigate('/rfox/claim')
        break
      case RfoxTabIndex.ChangeAddress:
        navigate('/rfox/change-address')
        break
    }
  }

  const TabHeader = useMemo(
    () => (
      <FormHeader items={FormHeaderItems} setStepIndex={handleTabChange} activeIndex={stepIndex} />
    ),
    [stepIndex, handleTabChange],
  )

  return (
    <Card width='full'>
      <Tabs variant='unstyled' index={stepIndex} isLazy>
        <TabPanels>
          <TabPanel px={0} py={0}>
            <Routes>
              <Route path='stake' element={<Stake headerComponent={TabHeader} setStepIndex={handleTabChange} />} />
              <Route path='' element={<Navigate to='stake' replace />} />
            </Routes>
          </TabPanel>
          <TabPanel px={0} py={0}>
            <Routes>
              <Route path='unstake' element={<Unstake headerComponent={TabHeader} />} />
            </Routes>
          </TabPanel>
          <TabPanel px={0} py={0}>
            <Routes>
              <Route path='claim' element={<Claim headerComponent={TabHeader} setStepIndex={handleTabChange} />} />
            </Routes>
          </TabPanel>
          <TabPanel px={0} py={0}>
            <Routes>
              <Route path='change-address' element={<ChangeAddress headerComponent={TabHeader} />} />
            </Routes>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Card>
  )
}
