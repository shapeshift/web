import { Button, Card, Flex, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { ChangeAddress } from './components/ChangeAddress/ChangeAddress'
import { Claim } from './components/Claim/Claim'
import { Stake } from './components/Stake/Stake'
import { Unstake } from './components/Unstake/Unstake'

type FormHeaderTabProps = {
  index: number
  onClick: (index: number) => void
  isActive?: boolean
} & PropsWithChildren

const activeStyle = { color: 'text.base' }

export const RfoxTabIndex = {
  Stake: 0,
  Unstake: 1,
  Claim: 2,
  ChangeAddress: 3,
}

const FormHeaderTab: React.FC<FormHeaderTabProps> = ({ index, onClick, isActive, children }) => {
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
const FormHeader: React.FC<FormHeaderProps> = ({ setStepIndex, activeIndex }) => {
  const translate = useTranslate()
  const handleClick = useCallback(
    (index: number) => {
      setStepIndex(index)
    },
    [setStepIndex],
  )
  return (
    <Flex px={6} py={4} gap={4} wrap='wrap'>
      <FormHeaderTab
        index={RfoxTabIndex.Stake}
        onClick={handleClick}
        isActive={activeIndex === RfoxTabIndex.Stake}
      >
        {translate('RFOX.stake')}
      </FormHeaderTab>
      <FormHeaderTab
        index={RfoxTabIndex.Unstake}
        onClick={handleClick}
        isActive={activeIndex === RfoxTabIndex.Unstake}
      >
        {translate('RFOX.unstake')}
      </FormHeaderTab>
      <FormHeaderTab
        index={RfoxTabIndex.Claim}
        onClick={handleClick}
        isActive={activeIndex === RfoxTabIndex.Claim}
      >
        {translate('RFOX.claim')}
      </FormHeaderTab>
      <FormHeaderTab
        index={RfoxTabIndex.ChangeAddress}
        onClick={handleClick}
        isActive={activeIndex === RfoxTabIndex.ChangeAddress}
      >
        {translate('RFOX.changeAddress')}
      </FormHeaderTab>
    </Flex>
  )
}

export const Widget: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(RfoxTabIndex.Stake)

  const TabHeader = useMemo(
    () => <FormHeader setStepIndex={setStepIndex} activeIndex={stepIndex} />,
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
