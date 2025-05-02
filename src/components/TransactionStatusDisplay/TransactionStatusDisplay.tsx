import { Button, CardBody, Heading, Icon, Stack } from '@chakra-ui/react'
import type { ReactElement } from 'react'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { RawText } from '@/components/Text'

interface TransactionStatusDisplayProps {
  icon?: React.ElementType
  iconColor?: string
  title: string | ReactElement
  subtitle?: string | ReactElement
  isLoading?: boolean
  primaryButtonText: string
  onPrimaryClick: () => void
  secondaryButtonText?: string
  onSecondaryClick?: () => void
}

export const TransactionStatusDisplay = ({
  icon,
  iconColor,
  title,
  subtitle,
  isLoading,
  primaryButtonText,
  onPrimaryClick,
  secondaryButtonText,
  onSecondaryClick,
}: TransactionStatusDisplayProps) => {
  return (
    <CardBody display='flex' flexDir='column' minHeight='350px' pb={6}>
      <Stack justifyContent='center' alignItems='center' gap={4} my='auto' flex={1}>
        {isLoading ? (
          <CircularProgress size='64px' />
        ) : (
          icon && <Icon as={icon} color={iconColor} boxSize='64px' />
        )}
        <Heading size='sm'>{title}</Heading>
        {subtitle && <RawText color='text.subtle'>{subtitle}</RawText>}
      </Stack>
      <Stack width='full' gap={2} mt='auto'>
        {secondaryButtonText && onSecondaryClick && (
          <Button
            variant='ghost'
            size='lg'
            colorScheme='blue'
            width='full'
            onClick={onSecondaryClick}
          >
            {secondaryButtonText}
          </Button>
        )}
        <Button size='lg' width='full' colorScheme='blue' onClick={onPrimaryClick}>
          {primaryButtonText}
        </Button>
      </Stack>
    </CardBody>
  )
}
