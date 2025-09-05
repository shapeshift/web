import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import { Box, Button, Collapse } from '@chakra-ui/react'
import type { ReactElement, ReactNode } from 'react'
import { useCallback, useMemo, useState } from 'react'

import { RawText } from '@/components/Text'

type ModalCollapsableSectionProps = {
  title: ReactElement | string
  titleRightComponent?: ReactElement
  icon?: ReactElement
  defaultOpen?: boolean
  children: ReactNode
}

const hover = { textDecoration: 'none' }

export const ModalCollapsableSection = ({
  title,
  icon,
  children,
  defaultOpen = true,
  titleRightComponent,
}: ModalCollapsableSectionProps) => {
  const [isOpen, setOpen] = useState(defaultOpen)
  const toggle = useCallback(() => setOpen(prev => !prev), [])

  const titleButtonChildren = useMemo(
    () => (
      <Box display='flex' justifyContent='space-between' mb={1} flex={1}>
        <RawText flex={1} textTransform='capitalize' textAlign='left'>
          {title}
        </RawText>
        {titleRightComponent && (
          <Box flex={1} textAlign='right'>
            {titleRightComponent}
          </Box>
        )}
      </Box>
    ),
    [title, titleRightComponent],
  )

  return (
    <Box>
      <Button
        flex={1}
        width='full'
        variant='link'
        _hover={hover}
        textAlign='left'
        justifyContent='flex-start'
        leftIcon={!!icon ? <Box color='text.subtle'>{icon}</Box> : undefined}
        rightIcon={
          isOpen ? <ChevronUpIcon color='text.subtle' /> : <ChevronDownIcon color='text.subtle' />
        }
        fontWeight='medium'
        children={titleButtonChildren}
        onClick={toggle}
      />
      <Collapse in={isOpen}>
        <Box mb={4}>{children}</Box>
      </Collapse>
    </Box>
  )
}
