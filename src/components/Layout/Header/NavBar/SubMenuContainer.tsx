import React from 'react'
import { SlideTransition } from 'components/SlideTransition'

export const SubMenuContainer: React.FC = ({ children }) => {
  return <SlideTransition>{children}</SlideTransition>
}
