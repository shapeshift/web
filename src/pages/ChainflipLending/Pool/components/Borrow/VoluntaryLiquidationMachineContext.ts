import { createActorContext } from '@xstate/react'

import { voluntaryLiquidationMachine } from './voluntaryLiquidationMachine'

export const VoluntaryLiquidationMachineCtx = createActorContext(voluntaryLiquidationMachine)
