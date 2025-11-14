import { Button, Circle, Flex, useColorModeValue } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useLocation } from 'react-router'
import { useNavigate } from 'react-router-dom'

import { OnboardingRoutes } from '../config'

export const OnboardPager: React.FC = () => {
  const location = useLocation()
  const activeRoute = location.pathname
  const navigate = useNavigate()
  const translate = useTranslate()
  const pageColor = useColorModeValue('gray.100', 'gray.700')
  const activeIndex = OnboardingRoutes.findIndex(route => route.path === activeRoute)

  const handleGoToPage = useCallback(
    (path: string) => {
      return navigate(path)
    },
    [navigate],
  )

  const renderPages = useMemo(() => {
    return OnboardingRoutes.map(route => (
      <Circle
        // we need to pass an arg here, so we need an anonymous function wrapper
        onClick={() => handleGoToPage(route.path)}
        size='10px'
        bg={route.path === activeRoute ? 'blue.500' : pageColor}
        key={route.path}
      />
    ))
  }, [activeRoute, handleGoToPage, pageColor])

  const handleNext = useCallback(() => {
    navigate(OnboardingRoutes[activeIndex + 1].path)
  }, [activeIndex, navigate])

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
