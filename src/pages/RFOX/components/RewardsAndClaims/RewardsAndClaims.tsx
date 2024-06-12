import { Button, Card, Flex, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

import { Claims } from './Claims'
import { Rewards } from './Rewards'

type FormHeaderTabProps = {
  index: number
  onClick: (index: number) => void
  isActive?: boolean
} & PropsWithChildren

const activeStyle = { color: 'text.base' }

export const RewardsAndClaimsTabIndex = {
  Rewards: 0,
  Claims: 1,
}

const RewardsAndClaimsTab: React.FC<FormHeaderTabProps> = ({
  index,
  onClick,
  isActive,
  children,
}) => {
  const handleClick = useCallback(() => {
    onClick(index)
  }, [index, onClick])
  return (
    <Button
      onClick={handleClick}
      isActive={isActive}
      variant='unstyled'
      color='text.subtle'
      _active={activeStyle}
    >
      {children}
    </Button>
  )
}

type FormHeaderProps = {
  setStepIndex: (index: number) => void
  activeIndex: number
}

const RewardsAndClaimsHeader: React.FC<FormHeaderProps> = ({ setStepIndex, activeIndex }) => {
  const isRewardsTabEnabled = useFeatureFlag('RFOXRewardsTab')
  const translate = useTranslate()
  const handleClick = useCallback(
    (index: number) => {
      setStepIndex(index)
    },
    [setStepIndex],
  )
  if (!isRewardsTabEnabled) return null

  return (
    <Flex gap={4}>
      <RewardsAndClaimsTab
        index={RewardsAndClaimsTabIndex.Rewards}
        onClick={handleClick}
        isActive={activeIndex === RewardsAndClaimsTabIndex.Rewards}
      >
        {translate('RFOX.rewards')}
      </RewardsAndClaimsTab>
      <RewardsAndClaimsTab
        index={RewardsAndClaimsTabIndex.Claims}
        onClick={handleClick}
        isActive={activeIndex === RewardsAndClaimsTabIndex.Claims}
      >
        {translate('RFOX.claims')}
      </RewardsAndClaimsTab>
    </Flex>
  )
}

export const RewardsAndClaims: React.FC = () => {
  const isRewardsTabEnabled = useFeatureFlag('RFOXRewardsTab')
  const [stepIndex, setStepIndex] = useState(RewardsAndClaimsTabIndex.Rewards)

  const TabHeader = useMemo(
    () => <RewardsAndClaimsHeader setStepIndex={setStepIndex} activeIndex={stepIndex} />,
    [stepIndex],
  )
  return (
    <Card>
      <Tabs variant='unstyled' index={stepIndex} isLazy>
        <TabPanels>
          {isRewardsTabEnabled && (
            <TabPanel px={0} py={0}>
              <Rewards headerComponent={TabHeader} />
            </TabPanel>
          )}
          <TabPanel px={0} py={0}>
            <Claims headerComponent={TabHeader} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Card>
  )
}
