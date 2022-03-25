import 'lib/polyfills'

import React from 'react'
import ReactDOM from 'react-dom'
import { renderConsoleArt } from 'lib/consoleArt'
import { reportWebVitals } from 'lib/reportWebVitals'

import { App } from './App'
import { AppProviders } from './AppProviders'

ReactDOM.render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
  document.getElementById('root')
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(x => console.info('reportWebVitals', x))

// Because ASCII Art
renderConsoleArt()
