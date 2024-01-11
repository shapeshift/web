import { ArrowForwardIcon } from '@chakra-ui/icons'
import type { StackProps, TextProps } from '@chakra-ui/react'
import { Box, Flex, Skeleton, Stack } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import type { ReactElement } from 'react'
import React from 'react'
import { shallowEqual } from 'react-redux'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { SlideTransitionX } from 'components/SlideTransitionX'
import { Text } from 'components/Text'

const iconProps = { boxSize: '14px' }

type DynamicComponentProps = {
  component: ReactElement
  newValue?: Record<string, any>
  label: string
  toolTipLabel?: string
  labelProps?: TextProps
  isLoading?: boolean
} & StackProps

export const DynamicComponent: React.FC<DynamicComponentProps> = ({
  component,
  newValue,
  label,
  toolTipLabel,
  labelProps,
  isLoading,
  ...rest
}) => {
  // Clone the child component and merge the newValue props if provided
  const previousProps = component.props
  const mergedProps = newValue ? { ...previousProps, ...newValue } : previousProps
  const clonedComponent = React.cloneElement(component, mergedProps)
  const previousComponent = React.cloneElement(component, previousProps)
  const shouldShowNewValue = newValue !== undefined && !shallowEqual(previousProps, mergedProps)
  return (
    <Stack spacing={0} {...rest}>
      <Flex gap={2} alignItems='center'>
        <Box
          color={newValue !== undefined ? 'text.subtle' : 'text.base'}
          transitionProperty='common'
          transitionDuration='normal'
        >
          <Skeleton isLoaded={!isLoading}>{previousComponent}</Skeleton>
        </Box>
        <AnimatePresence exitBeforeEnter>
          {shouldShowNewValue ? (
            <SlideTransitionX key={`${label}-new-value`}>
              <Flex gap={2} alignItems='center'>
                <ArrowForwardIcon color='text.subtle' />
                <Skeleton isLoaded={!isLoading}>{clonedComponent}</Skeleton>
              </Flex>
            </SlideTransitionX>
          ) : null}
        </AnimatePresence>
      </Flex>
      <Flex>
        {toolTipLabel ? (
          <HelperTooltip label={toolTipLabel} iconProps={iconProps}>
            <Text color='text.subtle' fontWeight='medium' translation={label} {...labelProps} />
          </HelperTooltip>
        ) : (
          <Text color='text.subtle' fontWeight='medium' translation={label} {...labelProps} />
        )}
      </Flex>
    </Stack>
  )
}
