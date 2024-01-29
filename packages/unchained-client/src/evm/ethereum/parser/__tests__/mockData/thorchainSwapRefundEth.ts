import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '0xa1e6d3cd2e4c5bc06af21835065a44eb2d207962ebf36b9e24a366eb20e906da',
  blockHash: '0x41f15066c42d1d393ba30ff0729521631080711e978d3596ee140ec7bd412369',
  blockHeight: 12604164,
  timestamp: 1623293292,
  status: 1,
  from: '0xBdd8CdB1158ba84DE117C8670BB27b80376Def1B',
  to: '0x42A5Ed456650a09Dc10EBc6361A7480fDd61f27B',
  confirmations: 6468300,
  value: '6412730000000000',
  fee: '1555280000000000',
  gasLimit: '90000',
  gasUsed: '38882',
  gasPrice: '40000000000',
  inputData:
    '0x574da717000000000000000000000000fc0cc6e85dff3d75e3985e0cb83b090cfd498dd100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016c8580db0c40000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000047524546554e443a3835314234393937434638463946424138303642333738304530433137384343423137334145373845334644353035364637333735423035394232324244334100000000000000000000000000000000000000000000000000',
  internalTxs: [
    {
      from: '0x42A5Ed456650a09Dc10EBc6361A7480fDd61f27B',
      to: '0xfc0Cc6E85dFf3D75e3985e0CB83B090cfD498dd1',
      value: '6412730000000000',
    },
  ],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1623293293190513791',
      height: '942854',
      in: [
        {
          address: '0xfc0cc6e85dff3d75e3985e0cb83b090cfd498dd1',
          coins: [
            {
              amount: '1361273',
              asset: 'ETH.ETH',
            },
          ],
          txID: '851B4997CF8F9FBA806B3780E0C178CCB173AE78E3FD5056F7375B059B22BD3A',
        },
      ],
      metadata: {
        refund: {
          affiliateAddress: '',
          affiliateFee: '0',
          memo: 'SWAP:BTC.BTC:3FFiJrNsGpvAZ8iuFivSDnTJ5oAg5JUHGw:33598',
          networkFees: [
            {
              amount: '720000',
              asset: 'ETH.ETH',
            },
          ],
          reason: 'fail swap, not enough fee',
        },
      },
      out: [
        {
          address: '0xfc0cc6e85dff3d75e3985e0cb83b090cfd498dd1',
          coins: [
            {
              amount: '641273',
              asset: 'ETH.ETH',
            },
          ],
          height: '942858',
          txID: 'A1E6D3CD2E4C5BC06AF21835065A44EB2D207962EBF36B9E24A366EB20E906DA',
        },
      ],
      pools: [],
      status: 'success',
      type: 'refund',
    },
  ],
  count: '1',
  meta: {
    nextPageToken: '9428549000000004',
    prevPageToken: '9428549000000004',
  },
}

export default { tx, actionsResponse }
