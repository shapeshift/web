import { Card, CardBody, Center, Heading, Image, LinkOverlay, Stack } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { RawText } from './Text'

const display = { base: 'none', md: 'flex' }

type BannerProps = {
  maxWidth?: number
  iconSrc: string
  titleKey: string
  descriptionKey: string
  ctaLink: string
  endingTimeMs?: number
}
export const Banner: React.FC<BannerProps> = props => {
  const { maxWidth, iconSrc, titleKey, descriptionKey, ctaLink, endingTimeMs } = props
  const translate = useTranslate()

  // Hide the banner after the campaign ends, if endingTimeMs is provided.  make a constant in  '@/lib/fees/constant' if you like.

  if (endingTimeMs !== undefined && Date.now() > endingTimeMs) return null

  // replace cta link with route, banner background with something pretty, title, icon, and description. then edit translations with the key.
  return (
    <LinkOverlay href={ctaLink} maxWidth={maxWidth} width='full' display={display} mb={4}>
      <Card overflow='hidden' width='full' position='relative'>
        <CardBody
          display='flex'
          alignItems='center'
          px={6}
          py={6}
          gap={8}
          background='radial-gradient(80.55% 64.84% at 22.24% 21.74%, rgba(236, 182, 149, 0.20) 0%, rgba(0, 0, 0, 0.00) 100%), radial-gradient(40% 96.58% at 6.8% 85.88%, rgba(172, 250, 112, 0.20) 0%, rgba(172, 250, 112, 0.00) 100%);'
        >
          <Center height='100%' width='80px' justifyContent='center' px={6}>
            <Image position='absolute' width='80px' src={iconSrc} alt='Banner' />
          </Center>
          <Stack>
            <Heading size='sm'>{translate(titleKey)}</Heading>
            <RawText color='text.subtle'>{translate(descriptionKey)} </RawText>
          </Stack>
        </CardBody>
      </Card>
    </LinkOverlay>
  )
}
