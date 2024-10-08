import { strictEqual } from 'assert';
import { describe, should } from 'micro-should';
import { trustedSetup } from './esm/index.js';
import { trustedSetup as fastSetup } from './esm/fast.js';

// eth-signer
import { KZG } from 'micro-eth-signer/kzg';

// kzg-wasm
import { loadKZG } from 'kzg-wasm';
// import { deepStrictEqual } from 'node:assert';

// c-kzg
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ckzg from 'c-kzg';

should('have correct amount of points', () => {
  strictEqual(trustedSetup.g1_lagrange.length, 4096);
  strictEqual(trustedSetup.g2_monomial.length, 65);
});
should('have proper points at index 0 and 4095', () => {
  strictEqual(trustedSetup.g1_lagrange[0], '0xa0413c0dcafec6dbc9f47d66785cf1e8c981044f7d13cfe3e4fcbb71b5408dfde6312493cb3c1d30516cb3ca88c03654');
  strictEqual(trustedSetup.g1_lagrange[4095], '0x825a6f586726c68d45f00ad0f5a4436523317939a47713f78fd4fe81cd74236fdac1b04ecd97c2d0267d6f4981d7beb1');
});
describe('cross-tests', () => {
  should('kzg-wasm', async () => {
    const strip0x = items => items.map((i) => i.substring(2)).join('');
    const g1 = strip0x(trustedSetup.g1_lagrange);
    const g2 = strip0x(trustedSetup.g2_monomial);
    const opts = { n1: 4096, n2: 65, g1, g2 };
    const kzg = await loadKZG(opts);
  });

  // Somehow this wrongly edits .txt file
  should('c-kzg', () => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    // Because it cannot receive JSON object, but requires path instead
    ckzg.loadTrustedSetup(1, __dirname + '/trusted_setup.json');
  });

  should('eth-signer', () => {
    const small = new KZG(trustedSetup);
    const fast = new KZG(fastSetup);
  });
})

should.run();