import { Button, Card, Center, Flex, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'

import { Stake } from './components/Stake/Stake'
import { Unstake } from './components/Unstake/Unstake'

type FormHeaderTabProps = {
  index: number
  onClick: (index: number) => void
  isActive?: boolean
} & PropsWithChildren

const activeStyle = { color: 'text.base' }
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
      <FormHeaderTab index={0} onClick={handleClick} isActive={activeIndex === 0}>
        {translate('RFOX.stake')}
      </FormHeaderTab>
      <FormHeaderTab index={1} onClick={handleClick} isActive={activeIndex === 1}>
        {translate('RFOX.unstake')}
      </FormHeaderTab>
    </Flex>
  )
}

export const RFOX: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(0)

  const TabHeader = useMemo(
    () => <FormHeader setStepIndex={setStepIndex} activeIndex={stepIndex} />,
    [stepIndex],
  )
  return (
    <Main py={16}>
      <Center>
        <Card width='full' maxWidth='md'>
          <Tabs variant='unstyled' index={stepIndex}>
            <TabPanels>
              <TabPanel px={0} py={0}>
                <Stake headerComponent={TabHeader} />
              </TabPanel>
              <TabPanel>
                <Unstake headerComponent={TabHeader} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Card>
      </Center>
    </Main>
  )
}
