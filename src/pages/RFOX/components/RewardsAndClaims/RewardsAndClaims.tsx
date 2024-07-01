import { Button, Card, Flex, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
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
  const translate = useTranslate()
  const handleClick = useCallback(
    (index: number) => {
      setStepIndex(index)
    },
    [setStepIndex],
  )

  const isRfoxRewardsTxHistoryEnabled = useFeatureFlag('RfoxRewardsTxHistory')

  return (
    <Flex gap={4}>
      {isRfoxRewardsTxHistoryEnabled && (
        <RewardsAndClaimsTab
          index={RewardsAndClaimsTabIndex.Rewards}
          onClick={handleClick}
          isActive={activeIndex === RewardsAndClaimsTabIndex.Rewards}
        >
          {translate('RFOX.rewards')}
        </RewardsAndClaimsTab>
      )}
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

type RewardsAndClaimsProps = {
  stakingAssetId: AssetId
  stakingAssetAccountId: AccountId | undefined
}

export const RewardsAndClaims: React.FC<RewardsAndClaimsProps> = ({
  stakingAssetId,
  stakingAssetAccountId,
}) => {
  const isRfoxRewardsTxHistoryEnabled = useFeatureFlag('RfoxRewardsTxHistory')
  const [stepIndex, setStepIndex] = useState(
    isRfoxRewardsTxHistoryEnabled
      ? RewardsAndClaimsTabIndex.Rewards
      : RewardsAndClaimsTabIndex.Claims,
  )

  const TabHeader = useMemo(
    () => <RewardsAndClaimsHeader setStepIndex={setStepIndex} activeIndex={stepIndex} />,
    [stepIndex],
  )
  return (
    <Card>
      <Tabs variant='unstyled' index={stepIndex} isLazy>
        <TabPanels>
          <TabPanel px={0} py={0}>
            <Rewards headerComponent={TabHeader} />
          </TabPanel>
          <TabPanel px={0} py={0}>
            <Claims
              headerComponent={TabHeader}
              stakingAssetId={stakingAssetId}
              stakingAssetAccountId={stakingAssetAccountId}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Card>
  )
}
