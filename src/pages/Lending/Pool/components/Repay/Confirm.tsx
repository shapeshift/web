import { CardHeader, Flex, Heading } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useHistory } from 'react-router'
import { WithBackButton } from 'components/MultiHopTrade/components/WithBackButton'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

import { RepayRoutePaths } from './types'

export const RepayConfirm = () => {
  const history = useHistory()
  const handleBack = useCallback(() => {
    history.push(RepayRoutePaths.Input)
  }, [history])
  return (
    <SlideTransition>
      <Flex flexDir='column' width='full'>
        <CardHeader>
          <WithBackButton handleBack={handleBack}>
            <Heading as='h5' textAlign='center'>
              <Text translation='Confirm' />
            </Heading>
          </WithBackButton>
        </CardHeader>
      </Flex>
    </SlideTransition>
  )
}
