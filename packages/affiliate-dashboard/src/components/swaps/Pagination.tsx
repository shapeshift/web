import { Button, Flex, Text } from '@chakra-ui/react'

interface PaginationProps {
  pageNumber: number
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
}

export const Pagination = ({
  pageNumber,
  hasNext,
  onPrevious,
  onNext,
}: PaginationProps): React.JSX.Element => (
  <Flex justify='center' align='center' gap={4} mb={6} wrap='wrap'>
    <Button
      size='sm'
      variant='outline'
      onClick={onPrevious}
      isDisabled={pageNumber === 1}
      bg='bg.surface'
      borderColor='border.subtle'
      color='fg.default'
      _hover={{ bg: 'bg.raised' }}
    >
      Previous
    </Button>
    <Text fontSize='sm' color='fg.muted'>
      Page {pageNumber}
    </Text>
    <Button
      size='sm'
      variant='outline'
      onClick={onNext}
      isDisabled={!hasNext}
      bg='bg.surface'
      borderColor='border.subtle'
      color='fg.default'
      _hover={{ bg: 'bg.raised' }}
    >
      Next
    </Button>
  </Flex>
)
