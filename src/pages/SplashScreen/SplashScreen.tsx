import { Center, Circle, Spinner } from '@chakra-ui/react'
import { isFirefox } from 'react-device-detect'

import Orbs from '@/assets/orbs.svg?url'
import OrbsStatic from '@/assets/orbs-static.png'
import { FoxIcon } from '@/components/Icons/FoxIcon'
import { Page } from '@/components/Layout/Page'
import { colors } from '@/theme/colors'

const after = {
  position: 'absolute',
  content: '""',
  left: 0,
  top: 0,
  width: '100%',
  height: '100vh',
  backgroundImage: `url(${isFirefox ? OrbsStatic : Orbs})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center center',
}

export const SplashScreen = () => {
  return (
    <Page>
      <Center flexDir='column' height='100vh' backgroundImage={colors.altBg} px={6} _after={after}>
        <Circle size='100px' mb={6}>
          <FoxIcon boxSize='100%' color='white' />
        </Circle>
        <Spinner />
      </Center>
    </Page>
  )
}
