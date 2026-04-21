import { Badge } from '@chakra-ui/react'

interface StatusBadgeProps {
  status: string
}

const getStyle = (status: string): { bg: string; color: string } => {
  switch (status.toUpperCase()) {
    case 'SUCCESS':
    case 'COMPLETE':
      return { bg: 'rgba(74, 222, 128, 0.1)', color: 'success' }
    case 'FAILED':
      return { bg: 'rgba(239, 68, 68, 0.1)', color: 'danger' }
    case 'PENDING':
    default:
      return { bg: 'rgba(250, 204, 21, 0.1)', color: 'warn' }
  }
}

export const StatusBadge = ({ status }: StatusBadgeProps): React.JSX.Element => {
  const { bg, color } = getStyle(status)
  return (
    <Badge
      px={2.5}
      py={0.5}
      borderRadius='md'
      bg={bg}
      color={color}
      fontSize='xs'
      fontWeight={500}
      textTransform='capitalize'
    >
      {status}
    </Badge>
  )
}
