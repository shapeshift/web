import type { FlattenedJWE } from 'jose/dist/types/types'

interface NativeWallet {
  key: string
  value: FlattenedJWE
}

export const wallet: NativeWallet = {
  key: '2f143fa0-1d0f-4fd4-9335-ee94aaaf2195',
  value: {
    ciphertext:
      'wOYmlWcuoBag69ybCaDX_WufQFuuhgSDbP-7bNspFn9kqiZ98SiHWTZNLsS0X7xKsJJ0HOLRoR-aWcj4ZBt8lC4kkluPQpV1DIsIqgXUDENbkDnePdYiBbWkAJ1v',
    encrypted_key: 'GAstJe867mFZrZ1yvrBvJ9JYOjqdPY4mfutDBQ73BgyLyjm-V6asNQ',
    iv: 'daAIhGxie9gyrEC5',
    protected:
      'eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2R0NNIiwiYXJnb24iOnsicGFyYWxsZWxpc20iOjEsIm1lbW9yeVNpemUiOjMyNzY4LCJpdGVyYXRpb25zIjozNH0sIm1ldGEiOnsiY3JlYXRlZEF0IjoxNjQzODQwODQ1NDY5LCJuYW1lIjoiY3lwcmVzcy10ZXN0In19',
    tag: 'Su-T0Lwx420jr_F6_yruYw',
  },
}
