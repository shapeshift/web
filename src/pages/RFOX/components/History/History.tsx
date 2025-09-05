import { Button, Card, Flex, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { Activity } from './Activity'
import { Rewards } from './Rewards'

type FormHeaderTabProps = {
  index: number
  onClick: (index: number) => void
  isActive?: boolean
} & PropsWithChildren

const activeStyle = { color: 'text.base' }

export const TxHistoryIndex = {
  Rewards: 0,
  Activity: 1,
}

const HistoryTab: React.FC<FormHeaderTabProps> = ({ index, onClick, isActive, children }) => {
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
      <HistoryTab
        index={TxHistoryIndex.Rewards}
        onClick={handleClick}
        isActive={activeIndex === TxHistoryIndex.Rewards}
      >
        {translate('RFOX.rewards')}
      </HistoryTab>
      <HistoryTab
        index={TxHistoryIndex.Activity}
        onClick={handleClick}
        isActive={activeIndex === TxHistoryIndex.Activity}
      >
        {translate('navBar.activity')}
      </HistoryTab>
    </Flex>
  )
}

export const History: React.FC = () => {
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
            <Activity headerComponent={TabHeader} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Card>
  )
}
