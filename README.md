# trusted-setups

Easily access KZG / ETH [trusted setups](https://vitalik.eth.limo/general/2022/03/14/trustedsetup.html) in JS.

Exports 3 files:

- `index.js` (default) - js-friendly trusted setup
- `fast.js` - faster, decompressed trusted setup for [eth-signer](https://github.com/paulmillr/micro-eth-signer)
- `trusted_setup.json`, for c-kzg and others

## Usage

> npm install trusted-setups

We test against [eth-signer](https://github.com/paulmillr/micro-eth-signer),
[kzg-wasm](https://github.com/ethereumjs/kzg-wasm) and
[c-kzg](https://github.com/ethereum/c-kzg-4844).
Other libraries with similar API should also work.

```js
import { trustedSetup } from 'trusted-setups';
// fast setup for eth-signer
import { trustedSetup as fast } from 'trusted-setups/fast.js';
// trustedSetup is { g1_lagrange: string[]; g2_monomial: string[] }

// eth-signer
import { KZG } from 'micro-eth-signer/kzg';
const kzg = new KZG(trustedSetup);

// kzg-wasm
const g1 = setup.g1_lagrange.map((i) => i.substring(2)).join('');
const g2 = setup.g2_monomial.map((i) => i.substring(2)).join('');
const opts = { n1: 4096, n2: 65, g1, g2 };
const kzg = await loadKZG(opts);

// c-kzg can't receive object, requires path
const __dirname = dirname(fileURLToPath(import.meta.url));
ckzg.loadTrustedSetup(1, __dirname + '/trusted_setup.json');

trustedSetup.g1_lagrange.slice(0, 2)
// [
//   '0xa0413c0dcafec6dbc9f47d66785cf1e8c981044f7d13cfe3e4fcbb71b5408dfde6312493cb3c1d30516cb3ca88c03654',
//   '0x8b997fb25730d661918371bb41f2a6e899cac23f04fc5365800b75433c0a953250e15e7a98fb5ca5cc56a8cd34c20c57'
// ]
trustedSetup.g2_monomial.slice(0, 2)
// [
//   '0x93e02b6052719f607dacd3a088274f65596bd0d09920b61ab5da61bbdc7f5049334cf11213945d57e5ac7d055d042b7e024aa2b2f08f0a91260805272dc51051c6e47ad4fa403b02b4510b647ae3d1770bac0326a805bbefd48056c8c121bdb8',
//   '0xb5bfd7dd8cdeb128843bc287230af38926187075cbfbefa81009a2ce615ac53d2914e5870cb452d2afaaab24f3499f72185cbfee53492714734429b7b38608e23926c911cceceac9a36851477ba4c60b087041de621000edc98edada20c1def2'
// ]
```

## Verification

`npm install && npm run build` will build files from `trusted_setup.txt`, which was copied from
[c-kzg-4844](https://github.com/ethereum/c-kzg-4844/blob/445387f7dfd95b2b0d74b537b9d28f7b603b6f24/src/trusted_setup.txt).

Its checksum is `d39b9f2d047cc9dca2de58f264b6a09448ccd34db967881a6713eacacf0f26b7`.

## License

MIT License

Copyright (c) 2024 Paul Miller (https://paulmillr.com)
