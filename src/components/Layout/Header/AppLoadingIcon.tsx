import { Center, CircularProgress } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { SlideTransitionY } from 'components/SlideTransitionY'
import { useIsAnyApiFetching } from 'hooks/useIsAnyApiFetching/useIsAnyApiFetching'

export const AppLoadingIcon: React.FC = () => {
  const isLoading = useIsAnyApiFetching()
  return (
    <Link to='/'>
      <AnimatePresence exitBeforeEnter initial={true}>
        {isLoading ? (
          <SlideTransitionY key='loader'>
            <Center boxSize='7'>
              <CircularProgress size={7} />
            </Center>
          </SlideTransitionY>
        ) : (
          <SlideTransitionY key='logo'>
            <FoxIcon boxSize='7' />
          </SlideTransitionY>
        )}
      </AnimatePresence>
    </Link>
  )
}
