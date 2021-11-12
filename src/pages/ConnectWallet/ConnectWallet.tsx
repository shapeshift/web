import { Button } from '@chakra-ui/button'
import { DarkMode } from '@chakra-ui/color-mode'
import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Badge, Center, Circle, Flex } from '@chakra-ui/layout'
import { Dispatch, useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import Orbs from 'assets/orbs.svg'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { Page } from 'components/Layout/Page'
import { RawText, Text } from 'components/Text'
import { ActionTypes, WalletActions } from 'context/WalletProvider/WalletProvider'
import { colors } from 'theme/colors'

type NoWalletProps = {
  dispatch: Dispatch<ActionTypes>
  isConnected: boolean
}

export const ConnectWallet = ({ dispatch, isConnected }: NoWalletProps) => {
  const history = useHistory()
  const translate = useTranslate()
  useEffect(() => {
    isConnected && history.push('/dashboard')
  }, [history, isConnected])
  return (
    <Page>
      <Flex
        width='full'
        bg='gray.900'
        position='fixed'
        py={3}
        px={4}
        alignItems='center'
        bottom={0}
        justifyContent='center'
      >
        <DarkMode>
          <Text color='white' fontWeight='bold' translation='connectWalletPage.shapeshift' />
          <Badge colorScheme='blue' ml={2}>
            {translate('connectWalletPage.alpha')}
          </Badge>
        </DarkMode>
      </Flex>
      <Center
        flexDir='column'
        height='100vh'
        backgroundImage={colors.altBg}
        px={6}
        _after={{
          position: 'absolute',
          content: '""',
          left: 0,
          top: 0,
          width: '100vw',
          height: '100vh',
          backgroundImage: `url(${Orbs})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center'
        }}
      >
        <Circle size='100px' mb={6}>
          <FoxIcon boxSize='100%' color='white' />
        </Circle>
        <Flex flexDir='row' textAlign='center' fontSize={{ base: '6xl', lg: '8xl' }} mb={6}>
          <RawText color='white' fontWeight='medium' lineHeight='1'>
            {translate('connectWalletPage.exploreThe')}{' '}
            <RawText color='blue.500' fontWeight='bold' as='span'>
              {translate('connectWalletPage.defiUniverse')}
            </RawText>
          </RawText>
        </Flex>
        <Text
          color='gray.500'
          fontSize='lg'
          mb={12}
          textAlign='center'
          translation='connectWalletPage.body'
        />
        <Button
          size='lg'
          zIndex={1}
          colorScheme='blue'
          rightIcon={<ArrowForwardIcon />}
          onClick={() => dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })}
        >
          <Text translation='connectWalletPage.cta' />
        </Button>
      </Center>
    </Page>
  )
}
