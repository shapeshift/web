import { CheckIcon, CopyIcon } from '@chakra-ui/icons'
import type { FlexProps } from '@chakra-ui/react'
import { Flex, IconButton, Tooltip } from '@chakra-ui/react'
import type { MouseEvent, PropsWithChildren } from 'react'
import React, { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'

type InlineCopyButtonProps = {
  value: string
  isDisabled?: boolean
  flexProps?: FlexProps
} & PropsWithChildren

const copyIcon = <CopyIcon />
const checkIcon = <CheckIcon />

export const InlineCopyButton: React.FC<InlineCopyButtonProps> = ({
  value,
  children,
  isDisabled,
  flexProps,
}) => {
  const translate = useTranslate()
  const { isCopied, isCopying, copyToClipboard } = useCopyToClipboard({ timeout: 2000 })

  const handleCopyClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      copyToClipboard(value)
    },
    [copyToClipboard, value],
  )

  const buttonProps = useMemo(
    () => ({
      icon: isCopied ? checkIcon : copyIcon,
      colorScheme: isCopied ? 'green' : 'gray',
      size: 'xs',
      variant: 'ghost',
      fontSize: 'sm',
      'aria-label': 'Copy value',
      onClick: handleCopyClick,
    }),
    [handleCopyClick, isCopied],
  )

  // Hide the copy button if it is disabled
  if (isDisabled) return <>{children}</>

  return (
    <Flex gap={2} alignItems='center' {...flexProps}>
      {children}
      {translate ? (
        <Tooltip isOpen={isCopying} label={translate('common.copied')}>
          <IconButton {...buttonProps} />
        </Tooltip>
      ) : (
        <IconButton {...buttonProps} />
      )}
    </Flex>
  )
}
