import { Button, Card, Center, Flex, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'

import { Bridge } from './components/Bridge/Bridge'
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

export const TabIndex = {
  Stake: 0,
  Unstake: 1,
  Claim: 2,
  ChangeAddress: 3,
  Bridge: 4,
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
    <Flex px={6} py={4} gap={4}>
      <FormHeaderTab
        index={TabIndex.Stake}
        onClick={handleClick}
        isActive={activeIndex === TabIndex.Stake}
      >
        {translate('RFOX.stake')}
      </FormHeaderTab>
      <FormHeaderTab
        index={TabIndex.Unstake}
        onClick={handleClick}
        isActive={activeIndex === TabIndex.Unstake}
      >
        {translate('RFOX.unstake')}
      </FormHeaderTab>
      <FormHeaderTab
        index={TabIndex.Claim}
        onClick={handleClick}
        isActive={activeIndex === TabIndex.Claim}
      >
        {translate('RFOX.claim')}
      </FormHeaderTab>
      <FormHeaderTab
        index={TabIndex.ChangeAddress}
        onClick={handleClick}
        isActive={activeIndex === TabIndex.ChangeAddress}
      >
        {translate('RFOX.changeAddress')}
      </FormHeaderTab>
      <FormHeaderTab
        index={TabIndex.Bridge}
        onClick={handleClick}
        isActive={activeIndex === TabIndex.Bridge}
      >
        {translate('RFOX.bridge')}
      </FormHeaderTab>
    </Flex>
  )
}

export const RFOX: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(TabIndex.Stake)

  const TabHeader = useMemo(
    () => <FormHeader setStepIndex={setStepIndex} activeIndex={stepIndex} />,
    [stepIndex],
  )
  return (
    <Main py={16}>
      <Center>
        <Card width='full' maxWidth='md'>
          <Tabs variant='unstyled' index={stepIndex} isLazy>
            <TabPanels>
              <TabPanel px={0} py={0}>
                <Stake headerComponent={TabHeader} />
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
              <TabPanel px={0} py={0}>
                <Bridge headerComponent={TabHeader} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Card>
      </Center>
    </Main>
  )
}
