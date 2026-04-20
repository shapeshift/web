import { Button, Flex, Text } from '@chakra-ui/react'

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export const Pagination = ({ page, totalPages, onChange }: PaginationProps): React.JSX.Element => (
  <Flex justify='center' align='center' gap={4} mb={6} wrap='wrap'>
    <Button
      size='sm'
      variant='outline'
      onClick={() => onChange(Math.max(0, page - 1))}
      isDisabled={page === 0}
      bg='bg.surface'
      borderColor='border.subtle'
      color='fg.default'
      _hover={{ bg: 'bg.raised' }}
    >
      Previous
    </Button>
    <Text fontSize='sm' color='fg.muted'>
      Page {page + 1} of {totalPages}
    </Text>
    <Button
      size='sm'
      variant='outline'
      onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
      isDisabled={page >= totalPages - 1}
      bg='bg.surface'
      borderColor='border.subtle'
      color='fg.default'
      _hover={{ bg: 'bg.raised' }}
    >
      Next
    </Button>
  </Flex>
)
