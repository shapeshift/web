import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import { Card, CardBody, Collapse, Flex, HStack, Icon, Stack } from '@chakra-ui/react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useMemo } from 'react'

import { RawText } from '@/components/Text'

dayjs.extend(relativeTime)

const divider = <RawText color='text.subtle'>•</RawText>

type ActionCardProps = {
  type: string
  formattedDate: string
  isCollapsable?: boolean
  isOpen?: boolean
  onToggle: () => void
  description: React.ReactNode | string
  footer?: React.ReactNode
  icon: React.ReactNode
  children: React.ReactNode
}

export const ActionCard = ({
  type,
  formattedDate,
  isCollapsable = false,
  isOpen,
  onToggle,
  description,
  icon,
  children,
  footer,
}: ActionCardProps) => {
  const hoverProps = useMemo(
    () => ({
      bg: isCollapsable ? 'background.button.secondary.hover' : 'transparent',
      cursor: isCollapsable ? 'pointer' : 'default',
      textDecoration: 'none',
    }),
    [isCollapsable],
  )

  const handleClick = useCallback(() => {
    if (isCollapsable) {
      onToggle()
    }
  }, [onToggle, isCollapsable])

  return (
    <Stack
      spacing={4}
      mx={2}
      borderRadius='lg'
      transitionProperty='common'
      transitionDuration='fast'
      _hover={hoverProps}
    >
      <Flex gap={4} alignItems='flex-start' px={4} py={4}>
        {icon}
        <Stack spacing={0} width='full'>
          <HStack fontSize='sm' justifyContent='space-between' fontWeight='medium'>
            <RawText>{type}</RawText>
            <RawText fontSize='xs' color='text.subtle'>
              {formattedDate}
            </RawText>
          </HStack>
          <HStack onClick={handleClick}>
            <Stack spacing={1} width='full'>
              <HStack>
                {description}
                {isCollapsable && (
                  <Icon
                    as={isOpen ? ChevronUpIcon : ChevronDownIcon}
                    ml='auto'
                    my='auto'
                    fontSize='xl'
                    color='text.subtle'
                  />
                )}
              </HStack>

              {footer && (
                <HStack fontSize='sm' color='text.subtle' divider={divider} flexWrap='wrap' gap={1}>
                  {footer}
                </HStack>
              )}
            </Stack>
          </HStack>
          {isCollapsable && (
            <Collapse in={isOpen}>
              <Card bg='transparent' mt={4}>
                <CardBody px={0} py={0}>
                  {children}
                </CardBody>
              </Card>
            </Collapse>
          )}
        </Stack>
      </Flex>
    </Stack>
  )
}
