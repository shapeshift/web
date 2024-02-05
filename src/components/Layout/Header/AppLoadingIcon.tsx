import { Center, Image } from '@chakra-ui/react'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import { AnimatePresence, motion } from 'framer-motion'
import { memo, useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Doge from 'assets/doge.png'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { SlideTransitionY } from 'components/SlideTransitionY'
import { useIsAnyApiFetching } from 'hooks/useIsAnyApiFetching/useIsAnyApiFetching'

dayjs.extend(isBetween)

const dogeVariants = {
  hidden: { rotate: 0, opacity: 0 },
  visible: { rotate: 360, opacity: 1 },
  exit: { rotate: -360, opacity: 0 },
}

export const AppLoadingIcon: React.FC = memo(() => {
  const [isHovered, setIsHovered] = useState(false)
  const isLoading = useIsAnyApiFetching()

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
  }, [])

  const isDogeDayEvent = useMemo(() => dayjs().isBetween('2023-11-01', '2023-11-03'), [])

  return (
    <Link to='/' onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <AnimatePresence mode='wait' initial>
        {isHovered && isDogeDayEvent ? (
          <motion.div
            key='doge-flip'
            initial='hidden'
            animate='visible'
            exit='exit'
            variants={dogeVariants}
          >
            <Image src={Doge} alt={'Doge'} boxSize='7' />
          </motion.div>
        ) : isLoading ? (
          <SlideTransitionY key='loader'>
            <Center boxSize='7'>
              <CircularProgress size={7} />
            </Center>
          </SlideTransitionY>
        ) : (
          <SlideTransitionY key='fox'>
            <FoxIcon boxSize='7' />
          </SlideTransitionY>
        )}
      </AnimatePresence>
    </Link>
  )
})
