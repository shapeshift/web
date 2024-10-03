import { Button, Card, Flex, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { Activity } from './Activity'
import { Claims } from './Claims'
import { Rewards } from './Rewards'

type FormHeaderTabProps = {
  index: number
  onClick: (index: number) => void
  isActive?: boolean
} & PropsWithChildren

const activeStyle = { color: 'text.base' }

export const TxHistoryIndex = {
  Rewards: 0,
  Claims: 1,
  Activity: 2,
}

const TxHistoryTab: React.FC<FormHeaderTabProps> = ({ index, onClick, isActive, children }) => {
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

const TxHistoryHeader: React.FC<FormHeaderProps> = ({ setStepIndex, activeIndex }) => {
  const translate = useTranslate()
  const handleClick = useCallback(
    (index: number) => {
      setStepIndex(index)
    },
    [setStepIndex],
  )

  return (
    <Flex gap={4}>
      <TxHistoryTab
        index={TxHistoryIndex.Rewards}
        onClick={handleClick}
        isActive={activeIndex === TxHistoryIndex.Rewards}
      >
        {translate('RFOX.rewards')}
      </TxHistoryTab>
      <TxHistoryTab
        index={TxHistoryIndex.Claims}
        onClick={handleClick}
        isActive={activeIndex === TxHistoryIndex.Claims}
      >
        {translate('RFOX.claims')}
      </TxHistoryTab>
      <TxHistoryTab
        index={TxHistoryIndex.Activity}
        onClick={handleClick}
        isActive={activeIndex === TxHistoryIndex.Activity}
      >
        {translate('common.activity')}
      </TxHistoryTab>
    </Flex>
  )
}

export const TxHistory: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(TxHistoryIndex.Rewards)

  const TabHeader = useMemo(
    () => <TxHistoryHeader setStepIndex={setStepIndex} activeIndex={stepIndex} />,
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
            <Claims headerComponent={TabHeader} />
          </TabPanel>
          <TabPanel px={0} py={0}>
            <Activity headerComponent={TabHeader} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Card>
  )
}
