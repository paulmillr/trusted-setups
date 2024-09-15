import { bls12_381 } from '@noble/curves/bls12-381';
import { readFileSync, writeFileSync } from 'node:fs';

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
  const str = `const g1_lagrange = \`${g1.join('\n')}\`;\nconst g2_monomial = \`${g2.join('\n')}\`;`
  const strESM = str + '\nexport const mainnetSetup = { g1_lagrange, g2_monomial };';
  const strCJS = str + '\nexports.mainnetSetup = { g1_lagrange, g2_monomial };';
  console.log('writing', file);
  writeFileSync(`${file}.mjs`, strESM);
  writeFileSync(`${file}.js`, strCJS);
}

function main() {
  console.log('reading txt');
  const lines = readFileSync('./trusted_setup.txt', 'utf-8').split('\n');
  const lengthG1 = Number.parseInt(lines[0]);
  const lengthG2 = Number.parseInt(lines[1]);
  const G1_end = 2 + lengthG1;
  const G1_lines = lines.slice(2, G1_end);
  const G2_lines = lines.slice(G1_end, G1_end + lengthG2);
  if (G1_lines.length !== lengthG1 || G2_lines.length !== lengthG2)
    throw new Error('invalid slice');

  // small.js
  console.log('checking validity');
  const G1_hexes = G1_lines.filter(assertLen(96));
  const G2_hexes = G2_lines.filter(assertLen(192));

  // fast.js, takes 3 sec
  console.log('decompressing points');
  const G1_points = G1_hexes.map(hexToCoords(bls12_381.G1.ProjectivePoint));
  const G2_points = G2_hexes.map(hexToCoords(bls12_381.G2.ProjectivePoint));
  write('small', G1_hexes, G2_hexes);
  write('fast', G1_points, G2_points);
}

main();
