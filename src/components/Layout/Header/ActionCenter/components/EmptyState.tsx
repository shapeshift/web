import { Box, Button, Card, CardBody, Flex, HStack, Icon, Stack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { TbBellFilled } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { Text } from '@/components/Text/Text'

type EmptyStateProps = {
  onClose: () => void
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onClose }) => {
  const navigate = useNavigate()
  const translate = useTranslate()

  const handleStartSwappingClick = useCallback(() => {
    navigate(TradeRoutePaths.Input)
    onClose()
  }, [navigate, onClose])

  return (
    <Stack spacing={4} mx={2} borderRadius='lg' transitionProperty='common'>
      <Flex gap={4} alignItems='flex-start' px={4} py={4}>
        <Flex
          align='center'
          justify='center'
          minW='35px'
          minH='35px'
          borderRadius='50%'
          bg='blue.500'
        >
          <Icon as={TbBellFilled} boxSize={5} color='white' />
        </Flex>
        <Stack spacing={0} width='full'>
          <HStack>
            <Stack spacing={1} width='full'>
              <Text fontSize='md' translation='actionCenter.emptyState.title' />
              <Box>
                <Text
                  fontSize='sm'
                  color='text.subtle'
                  translation='actionCenter.emptyState.body1'
                />
                <Text
                  fontSize='sm'
                  color='text.subtle'
                  translation='actionCenter.emptyState.body2'
                />
              </Box>
            </Stack>
          </HStack>
          <Card bg='transparent' mt={4}>
            <CardBody px={0} py={0}>
              <Stack gap={4}>
                <Button colorScheme='blue' width='full' onClick={handleStartSwappingClick}>
                  {translate('actionCenter.emptyState.startSwapping')}
                </Button>
              </Stack>
            </CardBody>
          </Card>
        </Stack>
      </Flex>
    </Stack>
  )
}
