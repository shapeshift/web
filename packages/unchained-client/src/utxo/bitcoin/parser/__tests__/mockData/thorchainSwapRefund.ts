import type { ActionsResponse } from '../../../../../parser/thorchain'
import type { Tx } from '../../../index'

const tx: Tx = {
  txid: '89d3c6fb860248a517bcff7b7e0846d76a6b67186da705f798cd3a2943e6d0b2',
  blockHash: '00000000000000000000121bb2cfa215a1ab0ebdd5678d842d366c9a724994b5',
  blockHeight: 825327,
  timestamp: 1704988619,
  confirmations: 21,
  value: '18460707810',
  fee: '84000',
  hex: '0100000000010a3f2df43a2781279dad4d7a64481a2807b79a3d337492d730c5dbe88f593c70fb0000000000ffffffff8e7cca97d39ba2b9672d5e0767fd4ef585b550d81a704391bc4f54e8151114410000000000ffffffff0bda57722360af6e0851ad16046092d69f812dd3b5d968a294248d28729c2bae0000000000ffffffffc8b27e5e2e8bdebf517214cafbaaa4a9729385b180e398f5a9168bdfcbee5e180000000000ffffffff3bf99bfc1c3a88006a562dae8297943301c94376ddde3c8ac7bb20301096a81d0000000000ffffffff5b5f8a88d131fb9f31925c946f0e726442cffd19b69bae325f13e1668820f25c0000000000ffffffffe8ed66136600f6e4eb36b34235e9adf0eb0a32d637b85e69ef98fba5ceda3f760000000000ffffffffb61e29afe2f4472ccbcf11604e95a2bd2e84f0dd43a3d21a4f022128971cd27c0000000000ffffffff32899a90939db6d58ad1cb8d8c5c5f80846bb375727cd72234e28c0e58b0f59e0000000000ffffffff655549e32bb2333d12948b32616b229b0ebf528d51c5f4daed78bac40e1756b40000000000ffffffff0344e92c0000000000160014842aa5a976f6b105f95af1a559438d6833dd14489e222b4c04000000160014407afe0a21bd5fed4aa98da464084dd2e8a29e0d0000000000000000496a47524546554e443a3141313544324334383846434136464534423530413933304244464346333230444144364643464636323942384439313331303634384533354643454539363702473044022049bcb0e5b47af2966cdaa0a0b8761e440c3e1d8aa51dacd617f7ddb121f2bb5102200f31957b4853f952da2d0341b11da79938f3f26d309a8179ba1c1289ec36eda201210306e6d1084d266a835aa01a36960bf69d225bad189172b28b48229d7a4371a82b02483045022100f3fb68819012cf4a291916eb7a5d45215bfd132d99e6ff673587ad0788d6c009022042767a073a0bd5227bb2fb9e584effe1d6bf7acba4afa96c0700da6da6fab4fb01210306e6d1084d266a835aa01a36960bf69d225bad189172b28b48229d7a4371a82b02473044022074865e4108cf0008fbc714d10b86620d964e0fb7bff0d26d6f7aef91fc18be48022013d00097d8c130354b6065a26857112bdf2c353cc888134399c9cee5b636106d01210306e6d1084d266a835aa01a36960bf69d225bad189172b28b48229d7a4371a82b024830450221008dfeb14c75fb044b7100b754373ab58fec8e7230ec7ad7c956c2a1b6199fea5d022069660918d0b3179034cb250889fcd7fbec50afe2ebb9afb82f2832e183deafba01210306e6d1084d266a835aa01a36960bf69d225bad189172b28b48229d7a4371a82b0247304402207d28b401712cac28ef7276c150a78c9fe50651e670a56460369e55c095fdb1da02200d8238234bc7ecb1d86033e15cd6a4a30eedbf6cdba76bc78ac99619258f4a1a01210306e6d1084d266a835aa01a36960bf69d225bad189172b28b48229d7a4371a82b02483045022100a9a8dbf1d87d69491cd52734ff4cd827e3b5f23f5303faadd884be61d887dfc20220163239b67d480d5183ce6dc6b7b0be9115041db06ea0ca113bccdf2745d71df701210306e6d1084d266a835aa01a36960bf69d225bad189172b28b48229d7a4371a82b02483045022100aa7b5ef2c58dea14febe32d39c01e9f0d1a15ec58c3351f5cb90b03c50dfbd3f022048b192e878010fcec6fd94dfa623f127be5a730454fea6d1b7650843f4b4af8901210306e6d1084d266a835aa01a36960bf69d225bad189172b28b48229d7a4371a82b02483045022100b3cd4ce3a1b586abd505a0f79b678a22fdf63635648880bd6784577caa1211710220494c89e72e041b435c3b4b5ad0c59891c8f041ad153aa4ae72abae559d45ea7101210306e6d1084d266a835aa01a36960bf69d225bad189172b28b48229d7a4371a82b02483045022100d203ee3d11068effa97a898f08170517d6d78612d1901e696932aec846d230a202207bef69105e5c60e9f987a3c2ee877303a0a2fb44ecab12cec99caba8dc643ded01210306e6d1084d266a835aa01a36960bf69d225bad189172b28b48229d7a4371a82b02483045022100cc66dcddb58c0c7a568e9c31834bf1030c427050864cb7582b347c367c9b477802207da615f7f66cc412f125ab8aa045a719e3a3e9772d9f14dfd975b08b73013f3a01210306e6d1084d266a835aa01a36960bf69d225bad189172b28b48229d7a4371a82b00000000',
  vin: [
    {
      txid: 'fb703c598fe8dbc530d79274333d9ab707281a48647a4dad9d2781273af42d3f',
      sequence: 4294967295,
      addresses: ['bc1qgpa0uz3ph4076j4f3kjxgzzd6t5298sdtjvwc9'],
      value: '89000000',
    },
    {
      txid: '41141115e8544fbc9143701ad850b585f54efd67075e2d67b9a29bd397ca7c8e',
      sequence: 4294967295,
      addresses: ['bc1qgpa0uz3ph4076j4f3kjxgzzd6t5298sdtjvwc9'],
      value: '163523',
    },
    {
      txid: 'ae2b9c72288d2494a268d9b5d32d819fd692600416ad51086eaf60237257da0b',
      sequence: 4294967295,
      addresses: ['bc1qgpa0uz3ph4076j4f3kjxgzzd6t5298sdtjvwc9'],
      value: '165727000',
    },
    {
      txid: '185eeecbdf8b16a9f598e380b1859372a9a4aafbca147251bfde8b2e5e7eb2c8',
      sequence: 4294967295,
      addresses: ['bc1qgpa0uz3ph4076j4f3kjxgzzd6t5298sdtjvwc9'],
      value: '1500000',
    },
    {
      txid: '1da896103020bbc78a3cdedd7643c90133949782ae2d566a00883a1cfc9bf93b',
      sequence: 4294967295,
      addresses: ['bc1qgpa0uz3ph4076j4f3kjxgzzd6t5298sdtjvwc9'],
      value: '31949738',
    },
    {
      txid: '5cf2208866e1135f32ae9bb619fdcf4264720e6f945c92319ffb31d1888a5f5b',
      sequence: 4294967295,
      addresses: ['bc1qgpa0uz3ph4076j4f3kjxgzzd6t5298sdtjvwc9'],
      value: '1140000',
    },
    {
      txid: '763fdacea5fb98ef695eb837d6320aebf0ade93542b336ebe4f600661366ede8',
      sequence: 4294967295,
      addresses: ['bc1qgpa0uz3ph4076j4f3kjxgzzd6t5298sdtjvwc9'],
      value: '18160651549',
    },
    {
      txid: '7cd21c972821024f1ad2a343ddf0842ebda2954e6011cfcb2c47f4e2af291eb6',
      sequence: 4294967295,
      addresses: ['bc1qgpa0uz3ph4076j4f3kjxgzzd6t5298sdtjvwc9'],
      value: '10000000',
    },
    {
      txid: '9ef5b0580e8ce23422d77c7275b36b84805f5c8c8dcbd18ad5b69d93909a8932',
      sequence: 4294967295,
      addresses: ['bc1qgpa0uz3ph4076j4f3kjxgzzd6t5298sdtjvwc9'],
      value: '160000',
    },
    {
      txid: 'b456170ec4ba78eddaf4c5518d52bf0e9b226b61328b94123d33b22be3495565',
      sequence: 4294967295,
      addresses: ['bc1qgpa0uz3ph4076j4f3kjxgzzd6t5298sdtjvwc9'],
      value: '500000',
    },
  ],
  vout: [
    {
      value: '2943300',
      n: 0,
      scriptPubKey: {
        hex: '0014842aa5a976f6b105f95af1a559438d6833dd1448',
      },
      addresses: ['bc1qss42t2tk76cst7267xj4jsuddqea69zgdkql89'],
    },
    {
      value: '18457764510',
      n: 1,
      scriptPubKey: {
        hex: '0014407afe0a21bd5fed4aa98da464084dd2e8a29e0d',
      },
      addresses: ['bc1qgpa0uz3ph4076j4f3kjxgzzd6t5298sdtjvwc9'],
    },
    {
      value: '0',
      n: 2,
      opReturn:
        'OP_RETURN (REFUND:1A15D2C488FCA6FE4B50A930BDFCF320DAD6FCFF629B8D91310648E35FCEE967)',
      scriptPubKey: {
        hex: '6a47524546554e443a31413135443243343838464341364645344235304139333042444643463332304441443646434646363239423844393133313036343845333546434545393637',
      },
    },
  ],
}

const actionsResponse: ActionsResponse = {
  actions: [
    {
      date: '1704985751404757954',
      height: '14229520',
      in: [
        {
          address: 'bc1qss42t2tk76cst7267xj4jsuddqea69zgdkql89',
          coins: [
            {
              amount: '8700',
              asset: 'BTC.BTC',
            },
          ],
          txID: '1A15D2C488FCA6FE4B50A930BDFCF320DAD6FCFF629B8D91310648E35FCEE967',
        },
      ],
      metadata: {
        swap: {
          affiliateAddress: 'ss',
          affiliateFee: '29',
          isStreamingSwap: false,
          liquidityFee: '5',
          memo: '=:ETH.ETH:0x7fFA927b18576304bFF35d5C1bFe20CDa66C1BF1:52656381:ss:29',
          networkFees: [
            {
              amount: '2000000',
              asset: 'THOR.RUNE',
            },
          ],
          swapSlip: '0',
          swapTarget: '0',
        },
      },
      out: [
        {
          address: 'thor1xmaggkcln5m5fnha2780xrdrulmplvfrz6wj3l',
          coins: [
            {
              amount: '76104597',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14229520',
          txID: '',
        },
        {
          address: 'bc1qss42t2tk76cst7267xj4jsuddqea69zgdkql89',
          coins: [
            {
              amount: '2943300',
              asset: 'BTC.BTC',
            },
          ],
          height: '14229955',
          txID: '89D3C6FB860248A517BCFF7B7E0846D76A6B67186DA705F798CD3A2943E6D0B2',
        },
      ],
      pools: ['BTC.BTC'],
      status: 'success',
      type: 'swap',
    },
    {
      date: '1704985728185659748',
      height: '14229517',
      in: [
        {
          address: 'bc1qss42t2tk76cst7267xj4jsuddqea69zgdkql89',
          coins: [
            {
              amount: '2991300',
              asset: 'BTC.BTC',
            },
          ],
          txID: '1A15D2C488FCA6FE4B50A930BDFCF320DAD6FCFF629B8D91310648E35FCEE967',
        },
      ],
      metadata: {
        refund: {
          affiliateAddress: 'ss',
          affiliateFee: '29',
          memo: '=:ETH.ETH:0x7fFA927b18576304bFF35d5C1bFe20CDa66C1BF1:52656381:ss:29',
          networkFees: [
            {
              amount: '69000',
              asset: 'BTC.BTC',
            },
            {
              amount: '2000000',
              asset: 'THOR.RUNE',
            },
          ],
          reason:
            'fail to add outbound tx: 2 errors occurred:\n\t* internal error\n\t* outbound amount does not meet requirements (52540689/52656381)\n\n',
        },
      },
      out: [
        {
          address: 'thor1xmaggkcln5m5fnha2780xrdrulmplvfrz6wj3l',
          coins: [
            {
              amount: '76104597',
              asset: 'THOR.RUNE',
            },
          ],
          height: '14229520',
          txID: '',
        },
        {
          address: 'bc1qss42t2tk76cst7267xj4jsuddqea69zgdkql89',
          coins: [
            {
              amount: '2943300',
              asset: 'BTC.BTC',
            },
          ],
          height: '14229955',
          txID: '89D3C6FB860248A517BCFF7B7E0846D76A6B67186DA705F798CD3A2943E6D0B2',
        },
      ],
      pools: [],
      status: 'success',
      type: 'refund',
    },
  ],
  count: '2',
  meta: {
    nextPageToken: '142295179000000377',
    prevPageToken: '142295209000000112',
  },
}

export default { tx, actionsResponse }
