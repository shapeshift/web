import { createActorContext } from '@xstate/react'

import { withdrawMachine } from './withdrawMachine'

export const WithdrawMachineCtx = createActorContext(withdrawMachine)
