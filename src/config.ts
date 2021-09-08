import * as envalid from 'envalid'

const { cleanEnv, url } = envalid

// add validators for each .env variable
// note env vars must be prefixed with REACT_APP_
const validators = {
  REACT_APP_UNCHAINED_URL: url()
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
