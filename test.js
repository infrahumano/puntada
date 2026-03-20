'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { buildOXS, hexToRgb, rgbToHex, escapeXml } = require('./puntada.js');

// ── XML helpers ───────────────────────────────────────────────────────────────

function attr(xml, tag, attrName) {
  const re = new RegExp(`<${tag}[^>]*\\s${attrName}="([^"]*)"`, 'g');
  const m = re.exec(xml);
  return m ? m[1] : null;
}

function findTags(xml, tagName) {
  const re = new RegExp(`<${tagName}\\s([^/]*)/?>`, 'g');
  const results = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    const attrs = {};
    const ar = /(\w+)="([^"]*)"/g;
    let a;
    while ((a = ar.exec(m[1])) !== null) attrs[a[1]] = a[2];
    results.push(attrs);
  }
  return results;
}

// ── Minimal fixture ───────────────────────────────────────────────────────────

function fixture(overrides = {}) {
  return {
    width:  3,
    height: 3,
    title:  'Test',
    software: 'puntada-test',
    palette: [
      { index: 0, name: 'cloth', color: 'FFFFFF' },
      { index: 1, name: 'Fill',  color: 'DA8028', strands: 2 },
    ],
    stitches: [
      { x: 0, y: 0, palindex: 1 }, { x: 1, y: 0, palindex: 1 }, { x: 2, y: 0, palindex: 1 },
      { x: 0, y: 1, palindex: 1 }, { x: 1, y: 1, palindex: 1 }, { x: 2, y: 1, palindex: 1 },
      { x: 0, y: 2, palindex: 1 }, { x: 1, y: 2, palindex: 1 }, { x: 2, y: 2, palindex: 1 },
    ],
    backstitches: [],
    ...overrides,
  };
}

// ── hexToRgb ──────────────────────────────────────────────────────────────────

test('hexToRgb: parses with hash', () => {
  assert.deepEqual(hexToRgb('#DA8028'), [218, 128, 40]);
});

test('hexToRgb: parses without hash', () => {
  assert.deepEqual(hexToRgb('DA8028'), [218, 128, 40]);
});

test('hexToRgb: black and white', () => {
  assert.deepEqual(hexToRgb('#000000'), [0, 0, 0]);
  assert.deepEqual(hexToRgb('#FFFFFF'), [255, 255, 255]);
});

// ── rgbToHex ──────────────────────────────────────────────────────────────────

test('rgbToHex: produces uppercase hex without #', () => {
  assert.equal(rgbToHex(218, 128, 40), 'DA8028');
  assert.equal(rgbToHex(0, 0, 0),      '000000');
  assert.equal(rgbToHex(255, 255, 255),'FFFFFF');
});

test('rgbToHex / hexToRgb: roundtrip', () => {
  const hex = 'A3B4C5';
  assert.equal(rgbToHex(...hexToRgb(hex)), hex);
});

// ── escapeXml ─────────────────────────────────────────────────────────────────

test('escapeXml: escapes ampersand', () => {
  assert.equal(escapeXml('a & b'), 'a &amp; b');
});

test('escapeXml: escapes angle brackets', () => {
  assert.equal(escapeXml('<tag>'), '&lt;tag&gt;');
});

test('escapeXml: escapes double quote', () => {
  assert.equal(escapeXml('"hi"'), '&quot;hi&quot;');
});

test('escapeXml: escapes single quote', () => {
  assert.equal(escapeXml("it's"), "it&apos;s");
});

test('escapeXml: no-op on clean strings', () => {
  assert.equal(escapeXml('hello world'), 'hello world');
});

// ── buildOXS: document structure ─────────────────────────────────────────────

test('buildOXS: returns a string', () => {
  assert.equal(typeof buildOXS(fixture()), 'string');
});

test('buildOXS: starts with XML declaration', () => {
  assert.ok(buildOXS(fixture()).startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
});

test('buildOXS: contains required top-level elements', () => {
  const oxs = buildOXS(fixture());
  for (const tag of ['<chart>', '</chart>', '<properties ', '<palette>', '</palette>',
                      '<fullstitches>', '</fullstitches>', '<backstitches>', '</backstitches>'])
    assert.ok(oxs.includes(tag), `missing: ${tag}`);
});

test('buildOXS: chartheight and chartwidth are set correctly', () => {
  const oxs = buildOXS(fixture({ width: 7, height: 5 }));
  assert.ok(oxs.includes('chartwidth="7"'));
  assert.ok(oxs.includes('chartheight="5"'));
});

// ── buildOXS: palettecount ────────────────────────────────────────────────────

test('buildOXS: palettecount excludes index 0 (cloth)', () => {
  const oxs = buildOXS(fixture());
  assert.equal(attr(oxs, 'properties', 'palettecount'), '1');
});

test('buildOXS: palettecount reflects all non-cloth items', () => {
  const oxs = buildOXS(fixture({
    palette: [
      { index: 0, name: 'cloth', color: 'FFFFFF' },
      { index: 1, name: 'A',     color: 'FF0000' },
      { index: 2, name: 'B',     color: '00FF00' },
      { index: 3, name: 'C',     color: '0000FF' },
    ],
  }));
  assert.equal(attr(oxs, 'properties', 'palettecount'), '3');
});

// ── buildOXS: palette items ───────────────────────────────────────────────────

test('buildOXS: all palette items present', () => {
  const oxs = buildOXS(fixture());
  const items = findTags(oxs, 'palette_item');
  assert.equal(items.length, 2);
});

test('buildOXS: cloth item at index 0', () => {
  const oxs   = buildOXS(fixture());
  const items = findTags(oxs, 'palette_item');
  const cloth = items.find(p => p.index === '0');
  assert.ok(cloth, 'no cloth item at index 0');
  assert.equal(cloth.color, 'FFFFFF');
});

test('buildOXS: color values are uppercase without #', () => {
  const oxs = buildOXS(fixture({
    palette: [
      { index: 0, name: 'cloth', color: '#ffffff' },
      { index: 1, name: 'Fill',  color: '#da8028' },
    ],
  }));
  assert.ok(oxs.includes('color="FFFFFF"'));
  assert.ok(oxs.includes('color="DA8028"'));
});

test('buildOXS: number defaults to "cloth" for index 0', () => {
  const oxs   = buildOXS(fixture());
  const items = findTags(oxs, 'palette_item');
  assert.equal(items[0].number, 'cloth');
});

test('buildOXS: number defaults to "Custom N" for other indices', () => {
  const oxs   = buildOXS(fixture());
  const items = findTags(oxs, 'palette_item');
  assert.equal(items[1].number, 'Custom 1');
});

test('buildOXS: optional palette attrs only emitted when provided', () => {
  const oxs = buildOXS(fixture());
  const items = findTags(oxs, 'palette_item');
  // strands was provided for index 1
  assert.equal(items[1].strands, '2');
  // printcolor was NOT provided — should be absent
  assert.ok(!oxs.includes('printcolor'));
});

test('buildOXS: charttitle is XML-escaped', () => {
  const oxs = buildOXS(fixture({ title: 'A & B < C' }));
  assert.ok(oxs.includes('charttitle="A &amp; B &lt; C"'));
});

// ── buildOXS: fullstitches ────────────────────────────────────────────────────

test('buildOXS: stitch count matches input', () => {
  const oxs = buildOXS(fixture());
  assert.equal(findTags(oxs, 'stitch').length, 9);
});

test('buildOXS: all stitch coordinates within [0, width) × [0, height)', () => {
  const oxs     = buildOXS(fixture());
  const stitches = findTags(oxs, 'stitch');
  for (const s of stitches) {
    assert.ok(parseInt(s.x) >= 0 && parseInt(s.x) < 3, `x=${s.x} out of bounds`);
    assert.ok(parseInt(s.y) >= 0 && parseInt(s.y) < 3, `y=${s.y} out of bounds`);
  }
});

test('buildOXS: all stitch palindex refs exist in palette', () => {
  const f       = fixture();
  const valid   = new Set(f.palette.map(p => String(p.index)));
  const oxs     = buildOXS(f);
  const stitches = findTags(oxs, 'stitch');
  for (const s of stitches)
    assert.ok(valid.has(s.palindex), `palindex ${s.palindex} not in palette`);
});

test('buildOXS: all NxN cells covered exactly once', () => {
  const N = 5;
  const stitches = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++)
      stitches.push({ x, y, palindex: 1 });

  const oxs    = buildOXS(fixture({ width: N, height: N, stitches }));
  const found  = findTags(oxs, 'stitch');
  const coords = new Set(found.map(s => `${s.x},${s.y}`));
  assert.equal(coords.size, N * N);
});

// ── buildOXS: backstitches ────────────────────────────────────────────────────

test('buildOXS: backstitches serialized correctly', () => {
  const oxs = buildOXS(fixture({
    backstitches: [{ x1: 0, y1: 0, x2: 1, y2: 0, palindex: 1 }],
  }));
  const bs = findTags(oxs, 'backstitch');
  assert.equal(bs.length, 1);
  assert.equal(bs[0].x1, '0');
  assert.equal(bs[0].y1, '0');
  assert.equal(bs[0].x2, '1');
  assert.equal(bs[0].y2, '0');
  assert.equal(bs[0].palindex, '1');
});

test('buildOXS: objecttype is always "backstitch"', () => {
  const oxs = buildOXS(fixture({
    backstitches: [{ x1: 0, y1: 0, x2: 1, y2: 0, palindex: 1 }],
  }));
  assert.ok(oxs.includes('objecttype="backstitch"'));
});

test('buildOXS: backstitch coordinates within [0, N] inclusive', () => {
  const N = 3;
  const oxs = buildOXS(fixture({
    backstitches: [
      { x1: 0, y1: 0, x2: N, y2: 0, palindex: 1 },  // top border
      { x1: 0, y1: N, x2: N, y2: N, palindex: 1 },  // bottom border
      { x1: 0, y1: 0, x2: 0, y2: N, palindex: 1 },  // left border
      { x1: N, y1: 0, x2: N, y2: N, palindex: 1 },  // right border
    ],
  }));
  const bs = findTags(oxs, 'backstitch');
  for (const b of bs) {
    for (const coord of [b.x1, b.y1, b.x2, b.y2])
      assert.ok(parseFloat(coord) >= 0 && parseFloat(coord) <= N, `coord ${coord} out of [0,${N}]`);
  }
});

test('buildOXS: all backstitch palindex refs exist in palette', () => {
  const f   = fixture({
    backstitches: [{ x1: 0, y1: 0, x2: 1, y2: 0, palindex: 1 }],
  });
  const valid = new Set(f.palette.map(p => String(p.index)));
  const oxs   = buildOXS(f);
  for (const b of findTags(oxs, 'backstitch'))
    assert.ok(valid.has(b.palindex), `palindex ${b.palindex} not in palette`);
});

test('buildOXS: empty backstitches produces empty element', () => {
  const oxs = buildOXS(fixture());
  assert.ok(oxs.includes('<backstitches>\n  </backstitches>'));
});

// ── buildOXS: snapshot ────────────────────────────────────────────────────────

test('buildOXS: snapshot of minimal 1×1 chart', () => {
  const oxs = buildOXS({
    width: 1, height: 1,
    title: 'Snap', software: 'puntada',
    palette: [
      { index: 0, name: 'cloth', color: 'FFFFFF' },
      { index: 1, name: 'Red',   color: 'FF0000', strands: 2 },
    ],
    stitches:    [{ x: 0, y: 0, palindex: 1 }],
    backstitches:[{ x1: 0, y1: 0, x2: 1, y2: 0, palindex: 1 }],
  });

  const expected = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<chart>',
    '  <properties oxsversion="1.0" software="puntada" chartheight="1" chartwidth="1" charttitle="Snap" palettecount="1"/>',
    '  <palette>',
    '    <palette_item index="0" number="cloth" name="cloth" color="FFFFFF"/>',
    '    <palette_item index="1" number="Custom 1" name="Red" color="FF0000" strands="2"/>',
    '  </palette>',
    '  <fullstitches>',
    '    <stitch x="0" y="0" palindex="1"/>',
    '  </fullstitches>',
    '  <backstitches>',
    '    <backstitch x1="0" y1="0" x2="1" y2="0" palindex="1" objecttype="backstitch"/>',
    '  </backstitches>',
    '</chart>',
  ].join('\n');

  assert.equal(oxs, expected);
});
