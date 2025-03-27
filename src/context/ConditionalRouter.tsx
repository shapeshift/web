import React from 'react'
import { BrowserRouter, HashRouter } from 'react-router-dom'

type ConditionalRouterProps = {
  children: React.ReactNode
  basename?: string
}

export const ConditionalRouter: React.FC<ConditionalRouterProps> = ({ children, basename }) => {
  // Check if we're on Fleek hosting
  const useHashRouter = window.location.hostname.includes('fleek.')

  if (useHashRouter) {
    return <HashRouter basename={basename}>{children}</HashRouter>
  }

  return <BrowserRouter basename={basename}>{children}</BrowserRouter>
}
