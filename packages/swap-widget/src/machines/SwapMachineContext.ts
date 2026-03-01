import { createActorContext } from '@xstate/react'

import { swapMachine } from './swapMachine'

export const SwapMachineCtx = createActorContext(swapMachine)
