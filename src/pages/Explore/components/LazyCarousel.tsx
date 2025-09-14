import { Skeleton } from '@chakra-ui/react'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Carousel } from '@/components/Carousel/Carousel'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'

const ExploreCard = lazy(() =>
  import('./ExploreCard').then(module => ({ default: module.ExploreCard })),
)

const carouselOptions = {
  loop: true,
}

const carouselSkeleton = <Skeleton height='150px' width='100%' borderRadius='10px' />

interface LazyCarouselProps {
  delay?: number
}

export const LazyCarousel = ({ delay = 300 }: LazyCarouselProps) => {
  const [shouldLoad, setShouldLoad] = useState(false)
  const navigate = useNavigate()
  const isRfoxFoxEcosystemPageEnabled = useFeatureFlag('RfoxFoxEcosystemPage')

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoad(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  const handlePoolsClick = useCallback(() => {
    navigate('/pools')
  }, [navigate])

  const handleFoxClick = useCallback(() => {
    navigate(isRfoxFoxEcosystemPageEnabled ? '/fox-ecosystem' : '/fox')
  }, [navigate, isRfoxFoxEcosystemPageEnabled])

  const handleTCYClick = useCallback(() => {
    navigate('/tcy')
  }, [navigate])

  const handleEarnClick = useCallback(() => {
    navigate('/wallet/earn')
  }, [navigate])

  if (!shouldLoad) {
    return carouselSkeleton
  }

  return (
    <Suspense fallback={carouselSkeleton}>
      <Carousel autoPlay showDots options={carouselOptions}>
        <ExploreCard
          title='navBar.foxEcosystem'
          body='explore.foxEcosystem.body'
          icon='fox'
          onClick={handleFoxClick}
        />
        <ExploreCard
          title='explore.pools.title'
          body='explore.pools.body'
          icon='pools'
          onClick={handlePoolsClick}
        />
        <ExploreCard
          title='explore.tcy.title'
          body='explore.tcy.body'
          icon='tcy'
          onClick={handleTCYClick}
        />
        <ExploreCard
          title='navBar.defi'
          body='defi.myPositionsBody'
          icon='defi'
          onClick={handleEarnClick}
        />
      </Carousel>
    </Suspense>
  )
}
