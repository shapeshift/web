import { useMediaQuery } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'
import React from 'react'
import { breakpoints } from 'theme/theme'

type DisplayCompoundProps = {
  Desktop: React.FC<{ children: React.ReactNode }>
  Mobile: React.FC<{ children: React.ReactNode }>
}

export const Display: React.FC<PropsWithChildren> & DisplayCompoundProps = ({ children }) => {
  return <>{children}</>
}

const Desktop: React.FC<PropsWithChildren> = ({ children }) => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  if (!isLargerThanMd) return null
  return <>{children}</>
}

const Mobile: React.FC<PropsWithChildren> = ({ children }) => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  if (isLargerThanMd) return null
  return <>{children}</>
}

Display.Desktop = Desktop
Display.Mobile = Mobile
