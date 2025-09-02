import { Image } from '@chakra-ui/react'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import { AnimatePresence, motion } from 'framer-motion'
import { memo, useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import Doge from '@/assets/doge.png'
import { ShapeShiftLogoText } from '@/components/Icons/ShapeShiftLogoText'
import { SlideTransitionY } from '@/components/SlideTransitionY'

dayjs.extend(isBetween)

const dogeVariants = {
  hidden: { rotate: 0, opacity: 0 },
  visible: { rotate: 360, opacity: 1 },
  exit: { rotate: -360, opacity: 0 },
}

export const AppLoadingIcon: React.FC = memo(() => {
  const [isHovered, setIsHovered] = useState(false)

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
        ) : (
          <SlideTransitionY key='shapeshift'>
            <ShapeShiftLogoText height='28px' width='auto' color='white' />
          </SlideTransitionY>
        )}
      </AnimatePresence>
    </Link>
  )
})
