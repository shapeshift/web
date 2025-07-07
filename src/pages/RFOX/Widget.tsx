import { Card, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

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

  const stepIndex = useMemo(() => {
    const path = location.pathname
    switch (true) {
      case path.includes('/stake'):
        return RfoxTabIndex.Stake
      case path.includes('/unstake'):
        return RfoxTabIndex.Unstake
      case path.includes('/claim'):
        return RfoxTabIndex.Claim
      case path.includes('/change-address'):
        return RfoxTabIndex.ChangeAddress
      default:
        return RfoxTabIndex.Stake
    }
  }, [location.pathname])

  // Handle tab navigation
  const handleTabChange = useCallback(
    (index: number) => {
      switch (index) {
        case RfoxTabIndex.Stake:
          navigate('/rfox/stake')
          break
        case RfoxTabIndex.Unstake:
          navigate('/rfox/unstake')
          break
        case RfoxTabIndex.Claim:
          // Claim is a lil bit different - it's the only one with top-level routing for all its route AND inner routes
          navigate('/rfox/claim')
          break
        case RfoxTabIndex.ChangeAddress:
          navigate('/rfox/change-address')
          break
        default:
          throw new Error(`Invalid tab index: ${index}`)
      }
    },
    [navigate],
  )

  const TabHeader = useMemo(
    () => (
      <FormHeader items={FormHeaderItems} setStepIndex={handleTabChange} activeIndex={stepIndex} />
    ),
    [stepIndex, handleTabChange],
  )

  const stakeElement = useMemo(
    () => <Stake headerComponent={TabHeader} setStepIndex={handleTabChange} />,
    [TabHeader, handleTabChange],
  )
  const stakeRedirect = useMemo(() => <Navigate to='stake' replace />, [])
  const unstakeElement = useMemo(() => <Unstake headerComponent={TabHeader} />, [TabHeader])
  const claimElement = useMemo(
    () => <Claim headerComponent={TabHeader} setStepIndex={handleTabChange} />,
    [TabHeader, handleTabChange],
  )
  const changeAddressElement = useMemo(
    () => <ChangeAddress headerComponent={TabHeader} />,
    [TabHeader],
  )

  return (
    <Card width='full'>
      <Tabs variant='unstyled' index={stepIndex} isLazy>
        <TabPanels>
          <TabPanel px={0} py={0}>
            <Routes>
              <Route path='stake' element={stakeElement} />
              <Route path='' element={stakeRedirect} />
            </Routes>
          </TabPanel>
          <TabPanel px={0} py={0}>
            <Routes>
              <Route path='unstake' element={unstakeElement} />
            </Routes>
          </TabPanel>
          <TabPanel px={0} py={0}>
            <Routes>
              <Route path='claim/*' element={claimElement} />
            </Routes>
          </TabPanel>
          <TabPanel px={0} py={0}>
            <Routes>
              <Route path='change-address' element={changeAddressElement} />
            </Routes>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Card>
  )
}
