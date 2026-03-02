import { createActorContext } from '@xstate/react'

import { egressMachine } from './egressMachine'

export const EgressMachineCtx = createActorContext(egressMachine)
