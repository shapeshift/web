import { createActorContext } from '@xstate/react'

import { depositMachine } from './depositMachine'

export const DepositMachineCtx = createActorContext(depositMachine)
