import { CheckIcon, CopyIcon } from '@chakra-ui/icons'
import { Flex, IconButton } from '@chakra-ui/react'
import type { MouseEvent, PropsWithChildren } from 'react'
import React, { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useCopyToClipboard } from 'hooks/useCopyToClipboard'

import { TooltipWithTouch } from './TooltipWithTouch'

type InlineCopyButtonProps = {
  value: string
  isDisabled?: boolean
} & PropsWithChildren

const copyIcon = <CopyIcon />
const checkIcon = <CheckIcon />

export const InlineCopyButton: React.FC<InlineCopyButtonProps> = ({
  value,
  children,
  isDisabled,
}) => {
  const translate = useTranslate()
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 })

  const handleCopyClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      copyToClipboard(value)
    },
    [copyToClipboard, value],
  )

  // Hide the copy button if it is disabled
  if (isDisabled) return <>{children}</>

  const buttonProps = {
    icon: isCopied ? checkIcon : copyIcon,
    colorScheme: isCopied ? 'green' : 'gray',
    size: 'xs',
    variant: 'ghost',
    fontSize: 'sm',
    'aria-label': 'Copy value',
    onClick: handleCopyClick,
  }

  return (
    <Flex gap={2} alignItems='center'>
      {children}
      {translate ? (
        <TooltipWithTouch label={translate(isCopied ? 'common.copied' : 'common.copy')}>
          <IconButton {...buttonProps} />
        </TooltipWithTouch>
      ) : (
        <IconButton {...buttonProps} />
      )}
    </Flex>
  )
}
