import { bls12_381 } from '@noble/curves/bls12-381.js';
import { bytesToHex } from '@noble/curves/utils.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { KZG } from 'micro-eth-signer/kzg.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { join as pjoin } from 'node:path';

const CHECKSUM = 'd39b9f2d047cc9dca2de58f264b6a09448ccd34db967881a6713eacacf0f26b7';
const CHECKSUM_output_mjs = '97d285835d5f2417e5a4dc875a1409c4fa6194f24fd00e83f3b02e042cad0b18';

const add0x = (lines) => lines.map((i) => `0x${i}`);
function assertLen(expectedLength) {
  return (str) => {
    if (str.length !== expectedLength) throw new Error('invalid string length');
    return str;
  };
}

function h(coord) {
  return coord.toString(16).padStart(96, '0');
}

function g2h(coord) {
  return [h(coord.c0), h(coord.c1)].join(',');
}

function hexToCoords(pointConstructor) {
  return (hex) => {
    const p = pointConstructor.fromHex(hex);
    const fn = hex.length === 96 ? h : g2h;
    return [fn(p.x), fn(p.y)].join(' ');
  };
}

function read_(path) {
  return readFileSync(pjoin(import.meta.dirname, '..', path), 'utf-8');
}

function write(path, data) {
  console.log('writing', path);
  writeFileSync(pjoin(import.meta.dirname, '..', path), data);
}

async function fk20precomputes() {
  // NOTE: at this point it should be already built
  const setup = (await import('../small-peerdas.js')).trustedSetup;
  const kzg = new KZG(setup);
  let ts = Date.now();
  kzg._Fk20Precomputes();
  console.log('calculate Fk20Precomputes', Date.now() - ts);
  return kzg.fk20Columns.flat().map((i) => {
    const { x, y } = i.toAffine();
    return [h(x), h(y)].join(' ');
  });
}

function writeFiles(file, g1, g2, g1_mon, fk20) {
  const g1_str = g1.join('\n');
  const g2_str = g2.join('\n');
  let res = `const g1 = \`${g1_str}\`;\nconst g2 = \`${g2_str}\`;\n`;
  if (g1_mon) res += `const g1_mon = \`${g1_mon.join('\n')}\`;\n`;
  if (fk20) res += `const fk20 = \`${fk20.join('\n')}\`;\n`;
  res += `const parse = (str) => str.split('\\n').map(l => '0x' + l);\n`;
  res += 'const setup = { g1_lagrange: parse(g1), g2_monomial: parse(g2)';
  if (g1_mon) res += ', g1_monomial: parse(g1_mon)';
  if (fk20) res += ', fk20: parse(fk20)';
  res += ' };\n';
  if (file.includes('fast')) res += 'setup.encoding = "fast_v1";\n';
  const resESM = res + 'export const trustedSetup = setup;\n';
  write(`${file}.js`, resESM);
  // const resCJS = res + 'exports.trustedSetup = setup;';
  // write(`cjs/${file}.js`, resCJS);
}

function assertSha256(buffer, checksum) {
  if (bytesToHex(sha256(new TextEncoder().encode(buffer))) !== checksum) throw new Error('invalid checksum');
}

async function main() {
  console.log('reading trusted_setup.txt');
  const rawFile = read_('trusted_setup.txt');
  const lines = rawFile.split('\n');
  assertSha256(rawFile, CHECKSUM);
  if (lines.length !== 2 + 4096 + 65 + 4096 + 1)
    // [info][g1_lag][g2_mon][g1_mon][eol]
    throw new Error('invalid file: ' + lines.length);
  const lengthG1 = Number.parseInt(lines[0]);
  const lengthG2 = Number.parseInt(lines[1]);

  const offset_a = 2 + lengthG1;
  const offset_b = offset_a + lengthG2;
  const g1_lag = lines.slice(2, offset_a).filter(assertLen(96));
  const g2_mon = lines.slice(offset_a, offset_b).filter(assertLen(192));
  const g1_mon = lines.slice(offset_b, 4096 + offset_b).filter(assertLen(96));

  // fast.js, takes 3 sec
  console.log('decompressing points');
  const start = Date.now();
  const g1_lag_raw = g1_lag.map(hexToCoords(bls12_381.G1.Point));
  const g2_mon_raw = g2_mon.map(hexToCoords(bls12_381.G2.Point));
  const g1_mon_raw = g1_mon.map(hexToCoords(bls12_381.G1.Point));
  console.log('decompressed in', Date.now() - start, 'ms');

  writeFiles('small-kzg', g1_lag, g2_mon);
  writeFiles('small-peerdas', g1_lag, g2_mon, g1_mon);
  writeFiles('fast-kzg', g1_lag_raw, g2_mon_raw);
  const fk20 = await fk20precomputes(); // requires small-kzg
  writeFiles('fast-peerdas', g1_lag_raw, g2_mon_raw, g1_mon_raw, fk20);

  const json =
    JSON.stringify(
      {
        g1_lagrange: add0x(g1_lag),
        g2_monomial: add0x(g2_mon),
        g1_monomial: add0x(g1_mon),
      },
      null,
      2
    ) + '\n';
  write('trusted_setup.json', json);

  console.log('verifying checksum of small-kzg.js');
  assertSha256(readFileSync('../small-kzg.js'), CHECKSUM_output_mjs);
}

main();
