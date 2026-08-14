import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'

import { ExternalWalletApp } from './ExternalWalletApp'
import { InternalWalletApp } from './InternalWalletApp'

const getRoute = () => window.location.hash.replace(/^#/, '').split('?')[0] || 'internal'

const Router = () => {
  const [route, setRoute] = useState(getRoute)

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (route === 'external') return <ExternalWalletApp />
  return <InternalWalletApp />
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>,
)
