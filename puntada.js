'use strict';

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const v = parseInt(hex.replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function rgbToHex(r, g, b) {
  return [r, g, b].map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('');
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── OXS builder ───────────────────────────────────────────────────────────────

/**
 * Build an OXS (Open Cross-Stitch) XML string.
 *
 * @param {object}  opts
 * @param {number}  opts.width               Chart width in stitches
 * @param {number}  opts.height              Chart height in stitches
 * @param {string}  [opts.title]             Chart title
 * @param {string}  [opts.software]          Producing software name
 * @param {Array}   opts.palette             Palette items (see below)
 * @param {Array}   opts.stitches            Full stitches: [{ x, y, palindex }, ...]
 * @param {Array}   [opts.backstitches]      Back stitches: [{ x1, y1, x2, y2, palindex }, ...]
 *
 * Palette item: { index, name, color, number?, strands?, printcolor?,
 *                 blendcolor?, bsstrands?, bscolor? }
 *   index 0 is the cloth/background and is excluded from palettecount.
 *   color: RGB hex string, with or without leading #.
 *
 * @returns {string}
 */
function buildOXS({ width, height, title = '', software = 'puntada', palette, stitches, backstitches = [] }) {
  const paletteCount = palette.filter(p => p.index !== 0).length;

  const L = [];
  L.push('<?xml version="1.0" encoding="UTF-8"?>');
  L.push('<chart>');
  L.push(`  <properties oxsversion="1.0" software="${escapeXml(software)}" chartheight="${height}" chartwidth="${width}" charttitle="${escapeXml(title)}" palettecount="${paletteCount}"/>`);

  L.push('  <palette>');
  for (const p of palette) {
    const color = p.color.replace('#', '').toUpperCase();
    const attrs = [
      `index="${p.index}"`,
      `number="${escapeXml(p.number ?? (p.index === 0 ? 'cloth' : `Custom ${p.index}`))}"`,
      `name="${escapeXml(p.name)}"`,
      `color="${color}"`,
    ];
    if (p.printcolor  != null) attrs.push(`printcolor="${p.printcolor.replace('#', '').toUpperCase()}"`);
    if (p.blendcolor  != null) attrs.push(`blendcolor="${escapeXml(p.blendcolor)}"`);
    if (p.strands     != null) attrs.push(`strands="${p.strands}"`);
    if (p.bsstrands   != null) attrs.push(`bsstrands="${p.bsstrands}"`);
    if (p.bscolor     != null) attrs.push(`bscolor="${p.bscolor.replace('#', '').toUpperCase()}"`);
    L.push(`    <palette_item ${attrs.join(' ')}/>`);
  }
  L.push('  </palette>');

  L.push('  <fullstitches>');
  for (const s of stitches)
    L.push(`    <stitch x="${s.x}" y="${s.y}" palindex="${s.palindex}"/>`);
  L.push('  </fullstitches>');

  L.push('  <backstitches>');
  for (const b of backstitches)
    L.push(`    <backstitch x1="${b.x1}" y1="${b.y1}" x2="${b.x2}" y2="${b.y2}" palindex="${b.palindex}" objecttype="backstitch"/>`);
  L.push('  </backstitches>');

  L.push('</chart>');
  return L.join('\n');
}

// ── Exports (Node.js / testing) ───────────────────────────────────────────────

if (typeof module !== 'undefined' && module.exports)
  module.exports = { buildOXS, hexToRgb, rgbToHex, escapeXml };
