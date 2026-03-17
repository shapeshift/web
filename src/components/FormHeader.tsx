import { Box, Flex } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { FormHeaderTab } from './FormHeaderTab'

type FormHeaderItem = {
  label: string
  index: number
}

type FormHeaderProps = {
  items: FormHeaderItem[]
  setStepIndex: (index: number) => void
  activeIndex: number
  rightElement?: React.ReactNode
}
export const FormHeader: React.FC<FormHeaderProps> = ({
  items,
  setStepIndex,
  activeIndex,
  rightElement,
}) => {
  const translate = useTranslate()
  const handleClick = useCallback(
    (index: number) => {
      setStepIndex(index)
    },
    [setStepIndex],
  )
  return (
    <Flex px={6} py={4} gap={4} wrap='nowrap' alignItems='center' justifyContent='space-between'>
      <Flex gap={4} wrap='wrap' alignItems='center' flex={1}>
        {items.map(item => (
          <FormHeaderTab
            key={item.index}
            index={item.index}
            onClick={handleClick}
            isActive={activeIndex === item.index}
          >
            {translate(item.label)}
          </FormHeaderTab>
        ))}
      </Flex>
      {rightElement != null && <Box flexShrink={0}>{rightElement}</Box>}
    </Flex>
  )
}
