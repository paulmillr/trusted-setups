import { bls12_381 } from '@noble/curves/bls12-381';
import { readFileSync, writeFileSync } from 'node:fs';
import { bytesToHex } from '@noble/curves/abstract/utils';
import { sha256 } from '@noble/hashes/sha2';

const CHECKSUM = 'd39b9f2d047cc9dca2de58f264b6a09448ccd34db967881a6713eacacf0f26b7';

const add0x = (lines) => lines.map((i) => `0x${i}`);
function assertLen(expectedLength) {
  return (str) => {
    if (str.length !== expectedLength) throw new Error('invalid string length')
    return str;
  }
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
    const fn = (hex.length === 96) ? h : g2h;
    return [fn(p.x), fn(p.y)].join(' ');
  }
}

function write(file, g1, g2) {
  let res = `const g1 = \`${g1.join('\n')}\`;\nconst g2 = \`${g2.join('\n')}\`;\n`
  res += `const parse = (str) => str.split('\\n').map(l => '0x' + l);\n`
  res += 'const setup = { g1_lagrange: parse(g1), g2_monomial: parse(g2) };\n'
  const resESM = res + 'export const trustedSetup = setup;\n';
  const resCJS = res + 'exports.trustedSetup = setup;';
  console.log('writing', file);
  writeFileSync(`${file}.mjs`, resESM);
  writeFileSync(`${file}.js`, resCJS);
}

function main() {
  console.log('reading txt');
  const rawFile = readFileSync('./trusted_setup.txt', 'utf-8');
  const lines = rawFile.split('\n');
  if (bytesToHex(sha256(rawFile)) !== CHECKSUM) throw new Error('invalid checksum');
  if (lines.length !== 2 + 4096 + 65 + 4096 + 1)
    throw new Error('invalid file: ' + lines.length);
  const lengthG1 = Number.parseInt(lines[0]);
  const lengthG2 = Number.parseInt(lines[1]);

  console.log('checking validity');
  const offset_a = 2 + lengthG1;
  const offset_b = offset_a + lengthG2;
  const g1_lag = lines.slice(2, offset_a).filter(assertLen(96));
  const g2_mon = lines.slice(offset_a, offset_b).filter(assertLen(192));
  const g1_mon = lines.slice(offset_b, 4096 + offset_b).filter(assertLen(96));

  // fast.js, takes 3 sec
  console.log('decompressing points');
  const g1_lag_raw = g1_lag.map(hexToCoords(bls12_381.G1.ProjectivePoint));
  const g2_mon_raw = g2_mon.map(hexToCoords(bls12_381.G2.ProjectivePoint));
  write('index', g1_lag, g2_mon);
  write('fast', g1_lag_raw, g2_mon_raw);

  console.log('writing trusted_setup.json');
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
  writeFileSync('trusted_setup.json', json);
}

main();
