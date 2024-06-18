import { Button, Card, Flex, TabPanel, TabPanels, Tabs, usePrevious } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { ChangeAddress } from './components/ChangeAddress/ChangeAddress'
import { Claim } from './components/Claim/Claim'
import type { RfoxClaimQuote } from './components/Claim/types'
import { Stake } from './components/Stake/Stake'
import { Unstake } from './components/Unstake/Unstake'

type FormHeaderTabProps = {
  index: number
  onClick: (index: number) => void
  isActive?: boolean
} & PropsWithChildren

const activeStyle = { color: 'text.base' }

export enum RfoxTabIndex {
  Stake,
  Unstake,
  Claim,
  ChangeAddress,
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

type WidgetProps = { confirmedQuote?: RfoxClaimQuote | undefined; initialStepIndex?: RfoxTabIndex }

export const Widget: React.FC<WidgetProps> = ({
  confirmedQuote,
  initialStepIndex = RfoxTabIndex.Stake,
}) => {
  const [stepIndex, setStepIndex] = useState(initialStepIndex)

  const previousInitialStepIndex = usePrevious(initialStepIndex)
  useEffect(() => {
    if (initialStepIndex !== previousInitialStepIndex) {
      setStepIndex(initialStepIndex)
    }
  }, [initialStepIndex, previousInitialStepIndex])

  const TabHeader = useMemo(
    () => <FormHeader setStepIndex={setStepIndex} activeIndex={stepIndex} />,
    [stepIndex],
  )
  return (
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
            <Claim
              confirmedQuote={confirmedQuote}
              headerComponent={TabHeader}
              setStepIndex={setStepIndex}
              initialIndex={confirmedQuote ? 1 : 0}
            />
          </TabPanel>
          <TabPanel px={0} py={0}>
            <ChangeAddress headerComponent={TabHeader} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Card>
  )
}
