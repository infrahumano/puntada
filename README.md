# puntada

Turns arrays into [OXS](https://www.ursasoftware.com/OXSFormat/) cross-stitch files. A small JavaScript library with no dependencies.

```js
const oxs = buildOXS({
  width: 10, height: 10,
  title: 'My Pattern',
  palette: [
    { index: 0, name: 'cloth', color: 'FFFFFF' },
    { index: 1, name: 'Red',   color: 'CC3333', strands: 2 },
  ],
  stitches:    [{ x: 0, y: 0, palindex: 1 }, ...],
  backstitches:[{ x1: 0, y1: 0, x2: 1, y2: 0, palindex: 1 }, ...],
});
```

## Usage

In the browser, include the script and call `buildOXS` directly:

```html
<script src="puntada.js"></script>
```

In Node.js:

```js
const { buildOXS, hexToRgb, rgbToHex } = require('./puntada.js');
```

## Tests

```sh
node test.js
```
