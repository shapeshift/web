import * as envalid from 'envalid'

import env from './env'

type Validators<T> = { [K in keyof T]: envalid.ValidatorSpec<T[K]> }

export type ValidatorResults<T extends Validators<any>> = {
  [K in keyof T]: T[K] extends envalid.ValidatorSpec<infer R> ? R : never
}

function reporter<T extends Validators<any>>({ errors }: envalid.ReporterOptions<T>) {
  for (const [key, err] of Object.entries<Error | undefined>(errors)) {
    if (!err) continue
    err.message = key
    console.error(err, key, 'Invalid Config')
  }
}

const configMap = new Map<object, object>()

export function getConfig<T extends Validators<any>>(
  validators: T,
): Readonly<ValidatorResults<T> & envalid.CleanedEnvAccessors> {
  return (
    (configMap.get(validators) as Readonly<ValidatorResults<T> & envalid.CleanedEnvAccessors>) ??
    (() => {
      const out = envalid.cleanEnv<ValidatorResults<T>>(env, Object.freeze(validators), {
        reporter,
      })
      configMap.set(validators, out)
      return out
    })()
  )
}
