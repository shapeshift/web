import { Badge } from '@chakra-ui/react'

interface StatusBadgeProps {
  status: string
}

export const StatusBadge = ({ status }: StatusBadgeProps): React.JSX.Element => {
  const isComplete = status === 'complete'
  return (
    <Badge
      px={2.5}
      py={0.5}
      borderRadius='md'
      bg={isComplete ? 'rgba(74, 222, 128, 0.1)' : 'rgba(250, 204, 21, 0.1)'}
      color={isComplete ? 'success' : 'warn'}
      fontSize='xs'
      fontWeight={500}
      textTransform='capitalize'
    >
      {status}
    </Badge>
  )
}
