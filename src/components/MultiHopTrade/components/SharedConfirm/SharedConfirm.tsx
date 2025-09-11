import type { CardFooterProps } from '@chakra-ui/react'
import { Card, CardBody, CardFooter, CardHeader, Heading } from '@chakra-ui/react'
import type { JSX } from 'react'

import { cardstyles } from '../../const'
import { WithBackButton } from '../WithBackButton'

import { TradeSlideTransition } from '@/components/MultiHopTrade/TradeSlideTransition'
import { Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'

type SharedConfirmProps = {
  bodyContent: JSX.Element
  footerContent: JSX.Element | null
  isLoading: boolean
  onBack: () => void
  headerTranslation: TextPropTypes['translation']
}

const cardMinHeight = { base: 'calc(100vh - var(--mobile-nav-offset))', md: 'initial' }
const footerPosition: CardFooterProps['position'] = { base: 'sticky', md: 'static' }

export const SharedConfirm = ({
  bodyContent,
  footerContent,
  onBack,
  headerTranslation,
}: SharedConfirmProps) => {
  return (
    <TradeSlideTransition>
      <Card flex={1} width='full' maxWidth='500px' minHeight={cardMinHeight} {...cardstyles}>
        <CardHeader px={6} pt={4} borderTop={'none'}>
          <WithBackButton onBack={onBack}>
            <Heading textAlign='center' fontSize='md'>
              <Text translation={headerTranslation} />
            </Heading>
          </WithBackButton>
        </CardHeader>
        <CardBody py={0} px={0} display='flex' flex='1'>
          {bodyContent}
        </CardBody>
        {footerContent && (
          <CardFooter
            borderTopWidth={1}
            borderColor='border.subtle'
            flexDir='column'
            px={0}
            py={0}
            position={footerPosition}
            bottom='var(--mobile-nav-offset)'
          >
            {footerContent}
          </CardFooter>
        )}
      </Card>
    </TradeSlideTransition>
  )
}
