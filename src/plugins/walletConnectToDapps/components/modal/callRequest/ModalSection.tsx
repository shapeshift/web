import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import { Box, Button, Collapse } from '@chakra-ui/react'
import type { ReactElement, ReactNode } from 'react'
import { useCallback, useState } from 'react'
import { RawText } from 'components/Text'

type ModalSectionProps = {
  title: ReactElement
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
        fontWeight='medium'
        children={
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
        }
        onClick={toggle}
      />
      <Collapse in={isOpen}>
        <Box mb={4}>{children}</Box>
      </Collapse>
    </Box>
  )
}
