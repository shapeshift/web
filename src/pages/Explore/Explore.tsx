import type { CardProps } from '@chakra-ui/react'
import { Card, CardBody, Center, Stack } from '@chakra-ui/react'
import type { JSX } from 'react'
import { memo, useCallback } from 'react'
import { RiExchangeFundsLine } from 'react-icons/ri'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { DefiIcon } from '@/components/Icons/DeFi'
import { FoxIcon } from '@/components/Icons/FoxIcon'
import { PoolsIcon } from '@/components/Icons/Pools'
import { TCYIcon } from '@/components/Icons/TCYIcon'
import { PageHeader } from '@/components/Layout/Header/PageHeader'
import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { Text } from '@/components/Text'

type ExploreCardProps = {
  title: string
  body: string
  icon: JSX.Element
} & CardProps

const activeCard = {
  opacity: 0.5,
}

const ExploreCard: React.FC<ExploreCardProps> = props => {
  const { title, body, icon, ...rest } = props
  return (
    <Card _active={activeCard} {...rest}>
      <CardBody display='flex' flexDir='column' alignItems='flex-start'>
        <Center fontSize='4xl' width='auto' mb={6}>
          {icon}
        </Center>
        <Stack>
          <Text fontWeight='bold' translation={title} />
          <Text color='whiteAlpha.700' translation={body} />
        </Stack>
      </CardBody>
    </Card>
  )
}

const poolsIcon = <PoolsIcon />
const lendingIcon = <RiExchangeFundsLine />
const foxIcon = <FoxIcon />
const tcyIcon = <TCYIcon />
const defiIcon = <DefiIcon />

const pageProps = { paddingTop: 4 }

export const Explore = memo(() => {
  const translate = useTranslate()
  const navigate = useNavigate()

  const handlePoolsClick = useCallback(() => {
    navigate('/pools')
  }, [navigate])

  const handleLendingClick = useCallback(() => {
    navigate('/lending')
  }, [navigate])

  const handleFoxClick = useCallback(() => {
    navigate('/fox')
  }, [navigate])

  const handleTCYClick = useCallback(() => {
    navigate('/tcy')
  }, [navigate])

  const handleEarnClick = useCallback(() => {
    navigate('/wallet/earn')
  }, [navigate])

  return (
    <>
      <PageHeader>
        <PageHeader.Middle>
          <PageHeader.Title>{translate('navBar.explore')}</PageHeader.Title>
        </PageHeader.Middle>
      </PageHeader>
      <Main
        px={4}
        pt={0}
        gap={4}
        display='flex'
        flexDir='column'
        flex={1}
        width='full'
        pb='calc(env(safe-area-inset-bottom) + 6rem + var(--safe-area-inset-bottom))'
        pageProps={pageProps}
      >
        <SEO title={translate('navBar.explore')} />
        <ExploreCard
          title='navBar.foxEcosystem'
          body='explore.foxEcosystem.body'
          icon={foxIcon}
          bg='linear-gradient(303deg, #3761F9 29.13%, #0CC 105.38%);'
          onClick={handleFoxClick}
        />
        <ExploreCard
          title='explore.pools.title'
          body='explore.pools.body'
          icon={poolsIcon}
          bg='linear-gradient(159deg, #319795 2.01%, #215063 86%);'
          onClick={handlePoolsClick}
        />
        <ExploreCard
          title='explore.lending.title'
          body='explore.lending.body'
          icon={lendingIcon}
          bg='linear-gradient(161deg, #D69E2E 6.22%, #935F22 87.07%)'
          onClick={handleLendingClick}
        />
        <ExploreCard
          title='explore.tcy.title'
          body='explore.tcy.body'
          icon={tcyIcon}
          bg='linear-gradient(159deg, #319795 2.01%, #215063 86%);'
          onClick={handleTCYClick}
        />
        <ExploreCard
          title='navBar.defi'
          body='defi.myPositionsBody'
          icon={defiIcon}
          bg='linear-gradient(161deg, #D6BCFA 6.22%, #553C9A 87.07%)'
          onClick={handleEarnClick}
        />
      </Main>
    </>
  )
})
