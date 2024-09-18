import { readFileSync, writeFileSync } from 'node:fs';
import { bls12_381 } from '@noble/curves/bls12-381';
import { bytesToHex } from '@noble/curves/abstract/utils';
import { sha256 } from '@noble/hashes/sha2';

const CHECKSUM = 'd39b9f2d047cc9dca2de58f264b6a09448ccd34db967881a6713eacacf0f26b7';
const CHECKSUM_index_mjs = '97d285835d5f2417e5a4dc875a1409c4fa6194f24fd00e83f3b02e042cad0b18';

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

function write(path, data) {
  console.log('writing', path);
  writeFileSync(path, data);
}

function writeFiles(file, g1, g2) {
  const g1_str = g1.join('\n');
  const g2_str = g2.join('\n');
  let res = `const g1 = \`${g1_str}\`;\nconst g2 = \`${g2_str}\`;\n`
  res += `const parse = (str) => str.split('\\n').map(l => '0x' + l);\n`
  res += 'const setup = { g1_lagrange: parse(g1), g2_monomial: parse(g2) };\n'
  if (file === 'fast') res += 'setup.encoding = "fast_v1";\n'
  const resESM = res + 'export const trustedSetup = setup;\n';
  const resCJS = res + 'exports.trustedSetup = setup;';
  write(`esm/${file}.js`, resESM);
  write(`${file}.js`, resCJS);
}

function assertSha256(buffer, checksum) {
  if (bytesToHex(sha256(buffer)) !== checksum) throw new Error('invalid checksum');
}

function main() {
  console.log('reading trusted_setup.txt');
  const rawFile = readFileSync('./trusted_setup.txt', 'utf-8');
  const lines = rawFile.split('\n');
  assertSha256(rawFile, CHECKSUM);
  if (lines.length !== 2 + 4096 + 65 + 4096 + 1) // [info][g1_lag][g2_mon][g1_mon][eol]
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
  const g1_lag_raw = g1_lag.map(hexToCoords(bls12_381.G1.ProjectivePoint));
  const g2_mon_raw = g2_mon.map(hexToCoords(bls12_381.G2.ProjectivePoint));

  console.log('decompressed in', Date.now() - start, 'ms');
  writeFiles('index', g1_lag, g2_mon);
  writeFiles('fast', g1_lag_raw, g2_mon_raw);

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

  console.log('verifying checksum of esm/index.js');
  assertSha256(readFileSync('./esm/index.js'), CHECKSUM_index_mjs);
}

main();
