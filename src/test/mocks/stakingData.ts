import { chainAdapters } from '@shapeshiftoss/types'
import { Staking } from 'state/slices/stakingDataSlice/stakingDataSlice'

export const mockStakingData: Staking = {
  delegations: [
    {
      amount: '4',
      assetId: 'cosmos:cosmoshub-4/slip44:118',
      validator: {
        address: 'cosmosvaloper1qtxec3ggeuwnca9mmngw7vf6ctw54cppey02fs',
        apr: '0.1662979435',
        commission: '0.000000000000000000',
        moniker: 'tokenpocket',
      },
    },
    {
      amount: '10015',
      assetId: 'cosmos:cosmoshub-4/slip44:118',
      validator: {
        address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
        apr: '0.1496681491',
        commission: '0.100000000000000000',
        moniker: 'ShapeShift DAO',
      },
    },
    {
      amount: '5000',
      assetId: 'cosmos:cosmoshub-4/slip44:118',
      validator: {
        address: 'cosmosvaloper1clpqr4nrk4khgkxj78fcwwh6dl3uw4epsluffn',
        apr: '0.1514974265',
        commission: '0.089000000000000000',
        moniker: 'Cosmostation',
      },
    },
  ],
  redelegations: [
    {
      destinationValidator: {
        address: 'cosmosvaloper1qtxec3ggeuwnca9mmngw7vf6ctw54cppey02fs',
        apr: '0.1662979435',
        commission: '0.000000000000000000',
        moniker: 'tokenpocket',
      },
      entries: [
        { amount: '4', assetId: 'cosmos:cosmoshub-4/slip44:118', completionTime: 1650470407 },
      ],
      sourceValidator: {
        address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
        apr: '0.1496681491',
        commission: '0.100000000000000000',
        moniker: 'ShapeShift DAO',
      },
    },
  ],
  rewards: [
    {
      rewards: [],
      validator: {
        address: 'cosmosvaloper1qtxec3ggeuwnca9mmngw7vf6ctw54cppey02fs',
        apr: '0.1662979435',
        commission: '0.000000000000000000',
        moniker: 'tokenpocket',
      },
    },
    {
      rewards: [
        {
          amount: '3.831752143667562385',
          assetId: 'cosmos:cosmoshub-4/slip44:118',
        },
      ],
      validator: {
        address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
        apr: '0.1496681491',
        commission: '0.100000000000000000',
        moniker: 'ShapeShift DAO',
      },
    },
    {
      rewards: [
        {
          amount: '12.688084635379675000',
          assetId: 'cosmos:cosmoshub-4/slip44:118',
        },
      ],
      validator: {
        address: 'cosmosvaloper1clpqr4nrk4khgkxj78fcwwh6dl3uw4epsluffn',
        apr: '0.1514974265',
        commission: '0.089000000000000000',
        moniker: 'Cosmostation',
      },
    },
  ],
  undelegations: [
    {
      entries: [
        {
          amount: '100',
          assetId: 'cosmos:cosmoshub-4/slip44:118',
          completionTime: 1650472940,
        },
      ],
      validator: {
        address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
        apr: '0.1496681491',
        commission: '0.100000000000000000',
        moniker: 'ShapeShift DAO',
      },
    },
  ],
}

export const mockStakingDataWithOnlyUndelegations: Staking = {
  delegations: [],
  redelegations: [],
  rewards: [],
  undelegations: [
    {
      entries: [
        {
          amount: '100',
          assetId: 'cosmos:cosmoshub-4/slip44:118',
          completionTime: 1650472940,
        },
        {
          amount: '250',
          assetId: 'cosmos:cosmoshub-4/slip44:118',
          completionTime: 1650472941,
        },
      ],
      validator: {
        address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
        apr: '0.1496681491',
        commission: '0.100000000000000000',
        moniker: 'ShapeShift DAO',
      },
    },
  ],
}

export const mockStakingDataWithOnlyRewards: Staking = {
  delegations: [],
  redelegations: [],
  rewards: [
    {
      rewards: [],
      validator: {
        address: 'cosmosvaloper1qtxec3ggeuwnca9mmngw7vf6ctw54cppey02fs',
        apr: '0.1662979435',
        commission: '0.000000000000000000',
        moniker: 'tokenpocket',
      },
    },
    {
      rewards: [
        {
          amount: '3.831752143667562385',
          assetId: 'cosmos:cosmoshub-4/slip44:118',
        },
        {
          amount: '1',
          assetId: 'cosmos:cosmoshub-4/slip44:118',
        },
      ],
      validator: {
        address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
        apr: '0.1496681491',
        commission: '0.100000000000000000',
        moniker: 'ShapeShift DAO',
      },
    },
    {
      rewards: [
        {
          amount: '12.688084635379675000',
          assetId: 'cosmos:cosmoshub-4/slip44:118',
        },
      ],
      validator: {
        address: 'cosmosvaloper1clpqr4nrk4khgkxj78fcwwh6dl3uw4epsluffn',
        apr: '0.1514974265',
        commission: '0.089000000000000000',
        moniker: 'Cosmostation',
      },
    },
  ],
  undelegations: [],
}

export const mockStakingWithUnknownValidators: Staking = {
  delegations: [
    {
      amount: '4',
      assetId: 'cosmos:cosmoshub-4/slip44:118',
      validator: {
        address: 'cosmosvaloper1r9lxkpqre6j4487ut882xchgr7rdtx3x76gtdp',
        apr: '0.1494726623',
        commission: '0.050000000000000000',
        moniker: 'terraform_staging_03',
      },
    },
    {
      amount: '10015',
      assetId: 'cosmos:cosmoshub-4/slip44:118',
      validator: {
        address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
        apr: '0.1496681491',
        commission: '0.100000000000000000',
        moniker: 'ShapeShift DAO',
      },
    },
    {
      amount: '5000',
      assetId: 'cosmos:cosmoshub-4/slip44:118',
      validator: {
        address: 'cosmosvaloper1yvwqd5rdtuaw25mcqhz794dvgq9k9yeh8mjcdh',
        apr: '0.1447524729',
        commission: '0.080000000000000000',
        moniker: 'ys-validator',
      },
    },
  ],
  redelegations: [
    {
      destinationValidator: {
        address: 'cosmosvaloper1r9lxkpqre6j4487ut882xchgr7rdtx3x76gtdp',
        apr: '0.1494726623',
        commission: '0.050000000000000000',
        moniker: 'terraform_staging_03',
      },
      entries: [
        { amount: '4', assetId: 'cosmos:cosmoshub-4/slip44:118', completionTime: 1650470407 },
      ],
      sourceValidator: {
        address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
        apr: '0.1496681491',
        commission: '0.100000000000000000',
        moniker: 'ShapeShift DAO',
      },
    },
  ],
  rewards: [
    {
      rewards: [],
      validator: {
        address: 'cosmosvaloper1r9lxkpqre6j4487ut882xchgr7rdtx3x76gtdp',
        apr: '0.1494726623',
        commission: '0.050000000000000000',
        moniker: 'terraform_staging_03',
      },
    },
    {
      rewards: [
        {
          amount: '3.831752143667562385',
          assetId: 'cosmos:cosmoshub-4/slip44:118',
        },
      ],
      validator: {
        address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
        apr: '0.1496681491',
        commission: '0.100000000000000000',
        moniker: 'ShapeShift DAO',
      },
    },
    {
      rewards: [
        {
          amount: '12.688084635379675000',
          assetId: 'cosmos:cosmoshub-4/slip44:118',
        },
      ],
      validator: {
        address: 'cosmosvaloper1yvwqd5rdtuaw25mcqhz794dvgq9k9yeh8mjcdh',
        apr: '0.1447524729',
        commission: '0.080000000000000000',
        moniker: 'ys-validator',
      },
    },
  ],
  undelegations: [
    {
      entries: [
        {
          amount: '100',
          assetId: 'cosmos:cosmoshub-4/slip44:118',
          completionTime: 1650472940,
        },
      ],
      validator: {
        address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
        apr: '0.1496681491',
        commission: '0.100000000000000000',
        moniker: 'ShapeShift DAO',
      },
    },
  ],
}

export const emptyMockStakingData: Staking = {
  delegations: [],
  redelegations: [],
  rewards: [],
  undelegations: [],
}

export const mockValidatorData: chainAdapters.cosmos.Validator[] = [
  {
    address: 'cosmosvaloper1qtxec3ggeuwnca9mmngw7vf6ctw54cppey02fs',
    apr: '0.1662979435',
    commission: '0.000000000000000000',
    moniker: 'tokenpocket',
  },
  {
    address: 'cosmosvaloper1qdxmyqkvt8jsxpn5pp45a38ngs36mn2604cqk9',
    apr: '0.1496681491',
    commission: '0.100000000000000000',
    moniker: '真本聪&IOSG',
  },
  {
    address: 'cosmosvaloper1q6d3d089hg59x6gcx92uumx70s5y5wadklue8s',
    apr: '0.1662979435',
    commission: '0.000000000000000000',
    moniker: 'UbikCapital(0%Commission)',
  },
  {
    address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
    apr: '0.1496681491',
    commission: '0.100000000000000000',
    moniker: 'ShapeShift DAO',
  },
  {
    address: 'cosmosvaloper1clpqr4nrk4khgkxj78fcwwh6dl3uw4epsluffn',
    apr: '0.1514974265',
    commission: '0.089000000000000000',
    moniker: 'Cosmostation',
  },
  {
    address: 'cosmosvaloper1gf3dm2mvqhymts6ksrstlyuu2m8pw6dhfp9md2',
    apr: '0.1496681491',
    commission: '0.100000000000000000',
    moniker: 'Blockapsis',
  },
  {
    address: 'cosmosvaloper1fqzqejwkk898fcslw4z4eeqjzesynvrdfr5hte',
    apr: '0.1513311286',
    commission: '0.090000000000000000',
    moniker: 'commercio.network',
  },
]
