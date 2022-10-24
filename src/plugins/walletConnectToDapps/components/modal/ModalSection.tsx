import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import { Box, Button, Collapse } from '@chakra-ui/react'
import type { ReactElement, ReactNode } from 'react'
import { useCallback, useState } from 'react'
import { RawText } from 'components/Text'

type ModalSectionProps = {
  title: string
  icon?: ReactElement
  defaultOpen?: boolean
  children: ReactNode
}

export const ModalSection: React.FC<ModalSectionProps> = ({
  title,
  icon,
  children,
  defaultOpen = true,
}) => {
  const [isOpen, setOpen] = useState(defaultOpen)
  const toggle = useCallback(() => setOpen(prev => !prev), [])
  return (
    <Box>
      <Button
        width='full'
        variant='link'
        textAlign='left'
        justifyContent='flex-start'
        leftIcon={!!icon ? <Box color='gray.500'>{icon}</Box> : undefined}
        rightIcon={
          isOpen ? <ChevronDownIcon color='gray.500' /> : <ChevronUpIcon color='gray.500' />
        }
        mb={4}
        fontWeight='medium'
        children={<RawText flex={1}>{title}</RawText>}
        onClick={toggle}
      />
      <Collapse in={isOpen}>{children}</Collapse>
    </Box>
  )
}
