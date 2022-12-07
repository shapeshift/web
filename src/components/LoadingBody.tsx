import { Center } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'

import { CircularProgress } from './CircularProgress/CircularProgress'

type LoadingBodyProps = {
  isLoaded?: boolean
} & PropsWithChildren

export const LoadingBody: React.FC<LoadingBodyProps> = ({ isLoaded, children }) => {
  return (
    <>
      {isLoaded ? (
        children
      ) : (
        <Center minHeight='24'>
          <CircularProgress />
        </Center>
      )}
    </>
  )
}
