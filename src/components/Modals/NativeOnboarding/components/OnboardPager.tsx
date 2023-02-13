import { Button, Circle, Flex, useColorModeValue } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'

import { OnboardingRoutes } from '../config'

type OnboardPagerProps = {
  activeRoute: string
}

export const OnboardPager: React.FC<OnboardPagerProps> = ({ activeRoute }) => {
  const history = useHistory()
  const translate = useTranslate()
  const pageColor = useColorModeValue('gray.100', 'gray.700')
  const activeIndex = OnboardingRoutes.findIndex(route => route.path === activeRoute)

  const handleGoToPage = useCallback(
    (path: string) => {
      return history.push(path)
    },
    [history],
  )

  const renderPages = useMemo(() => {
    return OnboardingRoutes.map(route => (
      <Circle
        onClick={() => handleGoToPage(route.path)}
        size='10px'
        bg={route.path === activeRoute ? 'blue.500' : pageColor}
      />
    ))
  }, [activeRoute, handleGoToPage, pageColor])

  const handleNext = useCallback(() => {
    history.push(OnboardingRoutes[activeIndex + 1].path)
  }, [activeIndex, history])

  const canGoNext = useMemo(() => {
    return activeIndex + 1 < OnboardingRoutes.length
  }, [activeIndex])

  return canGoNext ? (
    <Flex width='full' alignItems='center' justifyContent='space-between'>
      <Flex gap={2}>{renderPages}</Flex>
      <Button onClick={handleNext} colorScheme='blue'>
        {translate('common.next')}
      </Button>
    </Flex>
  ) : null
}
