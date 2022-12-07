import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter } from 'react-router-dom'

import { BridgeRoutes, entries } from './BridgeRoutes/BridgeRoutes'
import type { BridgeState } from './types'

export const Bridge = () => {
  const methods = useForm<BridgeState>({
    mode: 'onChange',
  })

  return (
    <FormProvider {...methods}>
      <MemoryRouter initialEntries={entries}>
        <BridgeRoutes />
      </MemoryRouter>
    </FormProvider>
  )
}
