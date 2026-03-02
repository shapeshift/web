import { createActorContext } from '@xstate/react'

import { repayMachine } from './repayMachine'

export const RepayMachineCtx = createActorContext(repayMachine)
