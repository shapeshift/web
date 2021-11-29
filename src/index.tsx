import 'lib/polyfills'

import React from 'react'
import ReactDOM from 'react-dom'
import { renderConsoleArt } from 'lib/consoleArt'
import { reportWebVitals } from 'lib/reportWebVitals'
import * as serviceWorker from 'lib/serviceWorker'

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

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorker.unregister()

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(x => console.info('reportWebVitals', x))

// Because ASCII Art
renderConsoleArt()
