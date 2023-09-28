import { ArrowForwardIcon } from '@chakra-ui/icons'
import type { StackProps, TextProps } from '@chakra-ui/react'
import { Box, Flex, Stack } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import type { ReactElement } from 'react'
import React from 'react'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { SlideTransition } from 'components/SlideTransition'
import { SlideTransitionX } from 'components/SlideTransitionX'
import { SlideTransitionY } from 'components/SlideTransitionY'
import { Text } from 'components/Text'

type PoolStatProps = {
  value: string
  newValue?: string
  label: string
  toolTipLabel?: string
}

export const PoolStat: React.FC<PoolStatProps> = ({ value, label, toolTipLabel }) => {
  return (
    <Stack spacing={0}>
      <Amount.Crypto value={value ?? ''} symbol='btc' fontSize='2xl' />
      {toolTipLabel ? (
        <HelperTooltip label={toolTipLabel}>
          <Text translation={label} />
        </HelperTooltip>
      ) : (
        <Text color='text.subtle' translation={label} />
      )}
    </Stack>
  )
}

type DynamicComponentProps = {
  component: ReactElement
  newValue?: Record<string, any>
  label: string
  toolTipLabel?: string
  labelProps?: TextProps
} & StackProps

export const DynamicComponent: React.FC<DynamicComponentProps> = ({
  component,
  newValue,
  label,
  toolTipLabel,
  labelProps,
  ...rest
}) => {
  // Clone the child component and merge the newValue props if provided
  const previousProps = component.props
  const mergedProps = newValue ? { ...previousProps, ...newValue } : previousProps
  const clonedComponent = React.cloneElement(component, mergedProps)
  const previousComponent = React.cloneElement(component, previousProps)
  return (
    <Stack spacing={0} {...rest}>
      <Flex gap={2} alignItems='center'>
        <Box
          color={newValue !== undefined ? 'text.subtle' : 'text.base'}
          transitionProperty='common'
          transitionDuration='normal'
        >
          {previousComponent}
        </Box>
        <AnimatePresence exitBeforeEnter>
          {newValue !== undefined ? (
            <SlideTransitionX>
              <Flex gap={2} alignItems='center' key={`${label}-new-value`}>
                <ArrowForwardIcon color='text.subtle' />
                {clonedComponent}
              </Flex>
            </SlideTransitionX>
          ) : null}
        </AnimatePresence>
      </Flex>
      <Box>
        {toolTipLabel ? (
          <HelperTooltip label={toolTipLabel}>
            <Text color='text.subtle' fontWeight='medium' translation={label} {...labelProps} />
          </HelperTooltip>
        ) : (
          <Text color='text.subtle' fontWeight='medium' translation={label} {...labelProps} />
        )}
      </Box>
    </Stack>
  )
}
