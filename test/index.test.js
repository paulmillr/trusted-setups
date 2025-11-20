import { describe, should } from '@paulmillr/jsbt/test.js';
import { strictEqual } from 'node:assert';
import { trustedSetup as fastSetup } from '../fast-kzg.js';
import { trustedSetup } from '../small-kzg.js';

// eth-signer
import { KZG } from 'micro-eth-signer/advanced/kzg.js';

// kzg-wasm
import { loadKZG } from 'kzg-wasm';
// import { deepStrictEqual } from 'node:assert';

// c-kzg
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
    // Because it cannot receive JSON object, but requires path instead
    ckzg.loadTrustedSetup(1, import.meta.dirname + '/../trusted_setup.json');
  });

  should('eth-signer', () => {
    const small = new KZG(trustedSetup);
    const fast = new KZG(fastSetup);
  });
})

should.run();