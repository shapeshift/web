import type { CardProps } from '@chakra-ui/react'
import { Card, CardBody, Center, Stack } from '@chakra-ui/react'
import { memo, useCallback } from 'react'
import { RiExchangeFundsLine } from 'react-icons/ri'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { DefiIcon } from 'components/Icons/DeFi'
import { PoolsIcon } from 'components/Icons/Pools'
import { RFOXIcon } from 'components/Icons/RFOX'
import { PageHeader } from 'components/Layout/Header/PageHeader'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { Text } from 'components/Text'

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

const stakingIcon = <DefiIcon />
const poolsIcon = <PoolsIcon />
const lendingIcon = <RiExchangeFundsLine />
const rfoxIcon = <RFOXIcon />

const pageProps = { paddingTop: 4 }

export const Explore = memo(() => {
  const translate = useTranslate()
  const history = useHistory()

  const handleStakingClick = useCallback(() => {
    history.push('/earn')
  }, [history])

  const handlePoolsClick = useCallback(() => {
    history.push('/pools')
  }, [history])

  const handleLendingClick = useCallback(() => {
    history.push('/lending')
  }, [history])

  const handleRFOXClick = useCallback(() => {
    history.push('/rfox')
  }, [history])

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
        pb='calc(env(safe-area-inset-bottom) + 6rem)'
        hideBreadcrumbs
        pageProps={pageProps}
      >
        <SEO title={translate('navBar.explore')} />
        <ExploreCard
          title='explore.rfox.title'
          body='explore.rfox.body'
          icon={rfoxIcon}
          bg='linear-gradient(303deg, #3761F9 29.13%, #0CC 105.38%);'
          onClick={handleRFOXClick}
        />
        <ExploreCard
          title='explore.staking.title'
          body='explore.staking.body'
          icon={stakingIcon}
          bg='linear-gradient(127deg, #805AD5 9.39%, #754095 71.63%);'
          onClick={handleStakingClick}
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
      </Main>
    </>
  )
})
