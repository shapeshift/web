import { Button, CardBody, CardFooter, Center, Heading, Link, Stack } from '@chakra-ui/react'
import type { TxStatus } from '@shapeshiftoss/unchained-client'
import { AnimatePresence } from 'framer-motion'
import type { InterpolationOptions } from 'node-polyglot'
import React from 'react'
import { useTranslate } from 'react-polyglot'
import { SlideTransition } from 'components/SlideTransition'
import { SlideTransitionY } from 'components/SlideTransitionY'
import { Text, type TextPropTypes } from 'components/Text/Text'

export type SharedBodyContent = {
  key: TxStatus
  title: string | [string, InterpolationOptions]
  body: TextPropTypes['translation']
  element: JSX.Element
}

type SharedStatusProps = {
  body: SharedBodyContent | null
  txLink?: string
  onBack?: () => void
}

export const SharedStatus: React.FC<SharedStatusProps> = ({ body, txLink, onBack }) => {
  const translate = useTranslate()

  return (
    <SlideTransition>
      {body && (
        <AnimatePresence mode='wait'>
          <SlideTransitionY key={body.key}>
            <CardBody py={12}>
              <Center flexDir='column' gap={4}>
                {body.element}
                <Stack spacing={2} alignItems='center'>
                  <Heading as='h4'>
                    {typeof body.title === 'string'
                      ? translate(body.title)
                      : translate(...body.title)}
                  </Heading>
                  <Text textAlign='center' translation={body.body} />
                </Stack>
              </Center>
            </CardBody>
          </SlideTransitionY>
        </AnimatePresence>
      )}
      <CardFooter flexDir='column' gap={2}>
        <Button as={Link} href={txLink} size='lg' variant='ghost' isExternal>
          {translate('trade.viewTransaction')}
        </Button>
        <Button size='lg' colorScheme='blue' onClick={onBack}>
          {translate('common.goBack')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
