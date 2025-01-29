import { Card, CardBody, CardFooter, CardHeader, Heading } from '@chakra-ui/react'
import { TradeSlideTransition } from 'components/MultiHopTrade/TradeSlideTransition'
import { Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'

import { WithBackButton } from '../WithBackButton'

const cardBorderRadius = { base: 'xl' }

type SharedConfirmProps = {
  bodyContent: JSX.Element
  footerContent: JSX.Element | null
  isLoading: boolean
  onBack: () => void
  headerTranslation: TextPropTypes['translation']
}

export const SharedConfirm = ({
  bodyContent,
  footerContent,
  onBack,
  headerTranslation,
}: SharedConfirmProps) => {
  return (
    <TradeSlideTransition>
      <Card flex={1} borderRadius={cardBorderRadius} width='full' maxWidth='500px'>
        <CardHeader px={6} pt={4}>
          <WithBackButton onBack={onBack}>
            <Heading textAlign='center' fontSize='md'>
              <Text translation={headerTranslation} />
            </Heading>
          </WithBackButton>
        </CardHeader>
        <CardBody py={0} px={0}>
          {bodyContent}
        </CardBody>
        {footerContent && (
          <CardFooter bg='background.surface.overlay.base' borderBottomRadius='xl'>
            {footerContent}
          </CardFooter>
        )}
      </Card>
    </TradeSlideTransition>
  )
}
