import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter } from 'react-router-dom'

import { TradeRoutes } from './TradeRoutes/TradeRoutes'

export const Trade = () => {
  const methods = useForm({ mode: 'onChange' })

  if (!methods) return null

  return (
    <FormProvider {...methods}>
      <MemoryRouter>
        <TradeRoutes />
      </MemoryRouter>
    </FormProvider>
  )
}
