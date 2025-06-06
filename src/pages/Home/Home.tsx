import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Flex } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { PriceTable } from './PriceTable'

import { Main } from '@/components/Layout/Main'
import { DashboardHeaderWrapper } from '@/pages/Dashboard/components/DashboardHeader/DashboardHeaderWrapper'
import { WalletBalance } from '@/pages/Dashboard/components/DashboardHeader/WalletBalance'
import { ProfileAvatar } from '@/pages/Dashboard/components/ProfileAvatar/ProfileAvatar'

const paddingTop = {
  base: 'calc(env(safe-area-inset-top) + 2rem + var(--safe-area-inset-top))',
  md: '4.5rem',
}
const marginTop = { base: 0, md: '-4.5rem' }
const activeStyle = { opacity: 0.5 }
const pageProps = { paddingTop: 0 }

export const Home = () => {
  const navigate = useNavigate()
  const handleWalletClick = useCallback(() => {
    navigate('/wallet')
  }, [navigate])
  return (
    <Main
      mt={0}
      pt={0}
      px={0}
      display='flex'
      flex={1}
      gap={6}
      width='full'
      flexDir='column'
      pageProps={pageProps}
    >
      <DashboardHeaderWrapper position='relative'>
        <Flex
          gap={4}
          px={6}
          pt={paddingTop}
          pb={6}
          marginTop={marginTop}
          _active={activeStyle}
          alignItems='center'
          onClick={handleWalletClick}
        >
          <ProfileAvatar />
          <WalletBalance label='defi.walletBalance' alignItems='flex-start' />
          <ArrowForwardIcon ml='auto' />
        </Flex>
      </DashboardHeaderWrapper>
      <PriceTable />
    </Main>
  )
}
