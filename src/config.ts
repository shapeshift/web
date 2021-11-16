import * as envalid from 'envalid'
import { bool } from 'envalid'

const { cleanEnv, str, url } = envalid

// add validators for each .env variable
// note env vars must be prefixed with REACT_APP_
const validators = {
  REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL: url(),
  REACT_APP_UNCHAINED_ETHEREUM_WS_URL: url(),
  REACT_APP_UNCHAINED_BITCOIN_HTTP_URL: url(),
  REACT_APP_UNCHAINED_BITCOIN_WS_URL: url(),
  REACT_APP_ETHEREUM_NODE_URL: url(),
  REACT_APP_PORTIS_DAPP_ID: str(),
  REACT_APP_HIDE_SPLASH: bool({ default: false })
}

function reporter<T>({ errors }: envalid.ReporterOptions<T>) {
  Object.entries(errors).forEach(([envVar, err]) => {
    if (!err) return
    console.error(
      envVar,
      'missing from config. Check sample.env and add it to your local .env and add a validator in config.ts'
    )
  })
}

const getConfig = () => cleanEnv(process.env, validators, { reporter })

export { getConfig }
