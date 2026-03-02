import { createActorContext } from '@xstate/react'

import { supplyMachine } from './supplyMachine'

export const SupplyMachineCtx = createActorContext(supplyMachine)
