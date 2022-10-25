import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import { Box, Button, Collapse } from '@chakra-ui/react'
import type { ReactElement, ReactNode } from 'react'
import { useCallback, useState } from 'react'
import { RawText } from 'components/Text'

type ModalSectionProps = {
  title: string
  titleRightComponent?: ReactElement
  icon?: ReactElement
  defaultOpen?: boolean
  children: ReactNode
}

export const ModalSection: React.FC<ModalSectionProps> = ({
  title,
  icon,
  children,
  defaultOpen = true,
  titleRightComponent = null,
}) => {
  const [isOpen, setOpen] = useState(defaultOpen)
  const toggle = useCallback(() => setOpen(prev => !prev), [])
  return (
    <Box>
      <Button
        flex={1}
        width='full'
        variant='link'
        _hover={{ textDecoration: 'none' }}
        textAlign='left'
        justifyContent='flex-start'
        leftIcon={!!icon ? <Box color='gray.500'>{icon}</Box> : undefined}
        rightIcon={
          isOpen ? <ChevronUpIcon color='gray.500' /> : <ChevronDownIcon color='gray.500' />
        }
        mb={4}
        fontWeight='medium'
        children={
          <Box display={'flex'} justifyContent={'space-between'}>
            <RawText flex={1}>{title}</RawText>
            {titleRightComponent}
          </Box>
        }
        onClick={toggle}
      />
      <Collapse in={isOpen}>{children}</Collapse>
    </Box>
  )
}
