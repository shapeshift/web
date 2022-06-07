import * as envalid from 'envalid'

type Validator<T> = (spec?: envalid.Spec<T>) => envalid.ValidatorSpec<T>

export type GuardedSpec<T, U extends T = T> = envalid.Spec<T> & {
  guard?: ((x: T) => x is U) | ((x: T) => boolean)
}

function guarded<T, U extends T = T>(
  validator: Validator<T>,
  spec?: GuardedSpec<T, U>,
): envalid.ValidatorSpec<U> {
  const validatorSpec = validator(spec)
  return Object.assign(Object.create(validatorSpec), {
    _parse(input: string): U {
      const out = validatorSpec._parse(input)
      if (spec?.guard?.(out) === false) throw new envalid.EnvError(`Invalid input: "${input}"`)
      return out as U
    },
  })
}

const makeGuarded =
  <T>(validator: Validator<T>) =>
  <U extends T = T>(spec?: GuardedSpec<T, U>) =>
    guarded(validator, spec)

// export const bool = (spec?: GuardedSpec<boolean, boolean>) => guarded(envalid.bool, spec)
export const bool = makeGuarded<boolean>(envalid.bool)
export const num = makeGuarded<number>(envalid.num)
export const str = makeGuarded<string>(envalid.str)
export const email = makeGuarded<string>(envalid.email)
export const host = makeGuarded<string>(envalid.host)
export const port = makeGuarded<number>(envalid.port)
export const url = makeGuarded<string>(envalid.url)
export const json = makeGuarded<unknown>(envalid.json)

type HttpUrl = `${'http:' | 'https:'}${string}`
export const httpUrl = (spec?: envalid.Spec<HttpUrl>) =>
  url({
    ...spec,
    guard: (x: string): x is HttpUrl => ['http:', 'https:'].includes(new URL(x).protocol),
  })

type WsUrl = `${'ws:' | 'wss:'}${string}`
export const wsUrl = (spec?: envalid.Spec<WsUrl>) =>
  url({
    ...spec,
    guard: (x: string): x is WsUrl => ['ws:', 'wss:'].includes(new URL(x).protocol),
  })

type EthAddress = `0x${string}`
export const ethAddress = (spec?: envalid.Spec<EthAddress>) =>
  str({
    ...spec,
    guard: (x: string): x is EthAddress => /^0x[0-9a-fA-F]{40}$/.test(x),
  })
