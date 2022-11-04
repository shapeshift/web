import { Center } from '@chakra-ui/layout'
import { Circle, Spinner } from '@chakra-ui/react'
import { isFirefox } from 'react-device-detect'
import Orbs from 'assets/orbs.svg'
import OrbsStatic from 'assets/orbs-static.png'
import { KeepKeyIcon } from 'components/Icons/KeepKeyIcon'
import { Page } from 'components/Layout/Page'
import { colors } from 'theme/colors'

export const SplashScreen = () => {
  return (
    <Page>
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
          backgroundImage: `url(${isFirefox ? OrbsStatic : Orbs})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
        }}
      >
        <Circle size='100px' mb={6}>
          <KeepKeyIcon boxSize='100%' color='white' />
        </Circle>
        <Spinner />
      </Center>
    </Page>
  )
}
