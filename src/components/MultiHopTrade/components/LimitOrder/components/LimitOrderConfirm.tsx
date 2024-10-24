import { Button, Card, CardBody, CardFooter, CardHeader, Heading } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useHistory } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

import { WithBackButton } from '../../WithBackButton'
import { LimitOrderRoutePaths } from '../types'

const cardBorderRadius = { base: 'xl' }

export const LimitOrderConfirm = () => {
  const history = useHistory()

  const handleBack = useCallback(() => {
    history.push(LimitOrderRoutePaths.Input)
  }, [history])

  const handleConfirm = useCallback(() => {
    history.push(LimitOrderRoutePaths.Status)
  }, [history])

  return (
    <SlideTransition>
      <Card
        flex={1}
        borderRadius={cardBorderRadius}
        width='full'
        variant='dashboard'
        maxWidth='500px'
      >
        <CardHeader px={6} pt={4}>
          <WithBackButton onBack={handleBack}>
            <Heading textAlign='center' fontSize='md'>
              <Text translation='limitOrder.confirm' />
            </Heading>
          </WithBackButton>
        </CardHeader>

        <CardBody py={0} px={0}>
          <></>
        </CardBody>
        <CardFooter
          flexDir='column'
          gap={2}
          px={4}
          borderTopWidth={1}
          borderColor='border.base'
          bg='background.surface.raised.base'
          borderBottomRadius='md'
        >
          <Button
            colorScheme={'blue'}
            size='lg'
            width='full'
            onClick={handleConfirm}
            isLoading={false}
          >
            <Text translation={'limitOrder.placeOrder'} />
          </Button>
        </CardFooter>
      </Card>
    </SlideTransition>
  )
}
