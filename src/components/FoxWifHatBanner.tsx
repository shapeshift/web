import { Card, CardBody, Center, Heading, Image, Link, Stack } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { RawText } from './Text'

import FoxWifHatIcon from '@/assets/foxwifhat-logo-no-bg.png'
import { FOX_WIF_HAT_CAMPAIGN_ENDING_TIME_MS } from '@/lib/fees/constant'

const display = { base: 'none', md: 'flex' }

type FoxWifHatBannerProps = { maxWidth?: number }
export const FoxWifHatBanner: React.FC<FoxWifHatBannerProps> = props => {
  const { maxWidth } = props
  const translate = useTranslate()

  // Hide the banner after the campaign ends
  if (Date.now() > FOX_WIF_HAT_CAMPAIGN_ENDING_TIME_MS) return null

  return (
    <Card overflow='hidden' maxWidth={maxWidth} position='relative' mb={4} display={display}>
      <CardBody
        display='flex'
        alignItems='center'
        px={6}
        py={6}
        gap={8}
        background='radial-gradient(80.55% 64.84% at 22.24% 21.74%, rgba(236, 182, 149, 0.20) 0%, rgba(0, 0, 0, 0.00) 100%), radial-gradient(40% 96.58% at 6.8% 85.88%, rgba(172, 250, 112, 0.20) 0%, rgba(172, 250, 112, 0.00) 100%);'
      >
        <Center height='100%' width='80px' justifyContent='center' px={6}>
          <Image position='absolute' width='80px' src={FoxWifHatIcon} alt='FOXwifhat' />
        </Center>
        <Stack>
          <Heading size='sm'>{translate('foxPage.foxWifHat.banner.title')}</Heading>
          <RawText color='text.subtle'>
            {translate('foxPage.foxWifHat.banner.description')}{' '}
            <Link color='text.link' href='/fox#/fox'>
              {translate('foxPage.foxWifHat.banner.cta')}
            </Link>
          </RawText>
        </Stack>
      </CardBody>
    </Card>
  )
}
