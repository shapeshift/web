import { Card, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { ChangeAddress } from './components/ChangeAddress/ChangeAddress'
import { Claim } from './components/Claim/Claim'
import { Stake } from './components/Stake/Stake'
import { Unstake } from './components/Unstake/Unstake'
import { RfoxRoute, RfoxSubRoute } from './types'

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
      case path.includes(RfoxRoute.Stake):
        return RfoxTabIndex.Stake
      case path.includes(RfoxRoute.Unstake):
        return RfoxTabIndex.Unstake
      case path.includes(RfoxRoute.Claim):
        return RfoxTabIndex.Claim
      case path.includes(RfoxRoute.ChangeAddress):
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
          navigate(RfoxRoute.Stake)
          break
        case RfoxTabIndex.Unstake:
          navigate(RfoxRoute.Unstake)
          break
        case RfoxTabIndex.Claim:
          navigate(RfoxRoute.Claim)
          break
        case RfoxTabIndex.ChangeAddress:
          navigate(RfoxRoute.ChangeAddress)
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
              <Route path={RfoxSubRoute.Stake} element={stakeElement} />
              <Route path='' element={stakeRedirect} />
            </Routes>
          </TabPanel>
          <TabPanel px={0} py={0}>
            <Routes>
              <Route path={RfoxSubRoute.Unstake} element={unstakeElement} />
            </Routes>
          </TabPanel>
          <TabPanel px={0} py={0}>
            <Routes>
              <Route path={`${RfoxSubRoute.Claim}/*`} element={claimElement} />
            </Routes>
          </TabPanel>
          <TabPanel px={0} py={0}>
            <Routes>
              <Route path={RfoxSubRoute.ChangeAddress} element={changeAddressElement} />
            </Routes>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Card>
  )
}
