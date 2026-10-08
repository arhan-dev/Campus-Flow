// Small QR Code generator: byte mode, error correction level M, versions 1 to 20 (up to 666 bytes).
// No dependencies. It follows the QR Code Model 2 standard (ISO/IEC 18004). The algorithm is the well known
// public one (Reed-Solomon over GF(256), 8 mask patterns, penalty scoring), written for this project.
// Used for the attendance QR and for the QR printed on certificates.

const MAX_VERSION = 20;
// Level M: error correction codewords per block, and number of blocks, indexed by version (index 0 unused)
const ECC_PER_BLOCK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26];
const NUM_BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16];
const FORMAT_BITS_M = 0; // the two format bits for level M

const getBit = (value, i) => ((value >>> i) & 1) !== 0;

function rawDataModules(ver) {
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (ver >= 7) result -= 36;
  }
  return result;
}

const dataCodewords = (ver) => Math.floor(rawDataModules(ver) / 8) - ECC_PER_BLOCK[ver] * NUM_BLOCKS[ver];

function alignmentPositions(ver, size) {
  if (ver === 1) return [];
  const numAlign = Math.floor(ver / 7) + 2;
  const step = Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
  return result;
}

// ---- Reed-Solomon over GF(2^8) with polynomial 0x11D ----
function gfMultiply(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function rsDivisor(degree) {
  const result = new Array(degree - 1).fill(0);
  result.push(1);
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < result.length; j += 1) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function rsRemainder(data, divisor) {
  const result = divisor.map(() => 0);
  data.forEach((b) => {
    const factor = b ^ result.shift();
    result.push(0);
    divisor.forEach((coef, i) => { result[i] ^= gfMultiply(coef, factor); });
  });
  return result;
}

function addEccAndInterleave(data, ver) {
  const numBlocks = NUM_BLOCKS[ver];
  const blockEccLen = ECC_PER_BLOCK[ver];
  const rawCodewords = Math.floor(rawDataModules(ver) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);
  const blocks = [];
  const divisor = rsDivisor(blockEccLen);
  for (let i = 0, k = 0; i < numBlocks; i += 1) {
    const dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
    k += dat.length;
    const ecc = rsRemainder(dat, divisor);
    if (i < numShortBlocks) dat.push(0);
    blocks.push(dat.concat(ecc));
  }
  const result = [];
  for (let i = 0; i < blocks[0].length; i += 1) {
    blocks.forEach((block, j) => {
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(block[i]);
    });
  }
  return result;
}

// ---- Matrix drawing ----
class Matrix {
  constructor(ver) {
    this.ver = ver;
    this.size = ver * 4 + 17;
    this.modules = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
    this.isFunction = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
  }

  setFunction(x, y, dark) {
    this.modules[y][x] = dark;
    this.isFunction[y][x] = true;
  }

  drawFunctionPatterns() {
    const { size } = this;
    for (let i = 0; i < size; i += 1) {
      this.setFunction(6, i, i % 2 === 0);
      this.setFunction(i, 6, i % 2 === 0);
    }
    this.drawFinder(3, 3);
    this.drawFinder(size - 4, 3);
    this.drawFinder(3, size - 4);
    const pos = alignmentPositions(this.ver, size);
    const n = pos.length;
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        const corner = (i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0);
        if (!corner) this.drawAlignment(pos[i], pos[j]);
      }
    }
    this.drawFormat(0); // reserves the format area; real bits are written once the mask is chosen
    this.drawVersion();
  }

  drawFinder(x, y) {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) this.setFunction(xx, yy, dist !== 2 && dist !== 4);
      }
    }
  }

  drawAlignment(x, y) {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) this.setFunction(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }

  drawFormat(mask) {
    const { size } = this;
    const data = (FORMAT_BITS_M << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i += 1) this.setFunction(8, i, getBit(bits, i));
    this.setFunction(8, 7, getBit(bits, 6));
    this.setFunction(8, 8, getBit(bits, 7));
    this.setFunction(7, 8, getBit(bits, 8));
    for (let i = 9; i < 15; i += 1) this.setFunction(14 - i, 8, getBit(bits, i));
    for (let i = 0; i < 8; i += 1) this.setFunction(size - 1 - i, 8, getBit(bits, i));
    for (let i = 8; i < 15; i += 1) this.setFunction(8, size - 15 + i, getBit(bits, i));
    this.setFunction(8, size - 8, true); // the fixed dark module
  }

  drawVersion() {
    if (this.ver < 7) return;
    let rem = this.ver;
    for (let i = 0; i < 12; i += 1) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (this.ver << 12) | rem;
    for (let i = 0; i < 18; i += 1) {
      const dark = getBit(bits, i);
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.setFunction(a, b, dark);
      this.setFunction(b, a, dark);
    }
  }

  drawCodewords(data) {
    const { size } = this;
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert += 1) {
        for (let j = 0; j < 2; j += 1) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vert : vert;
          if (!this.isFunction[y][x] && i < data.length * 8) {
            this.modules[y][x] = getBit(data[i >>> 3], 7 - (i & 7));
            i += 1;
          }
        }
      }
    }
  }

  applyMask(mask) {
    for (let y = 0; y < this.size; y += 1) {
      for (let x = 0; x < this.size; x += 1) {
        let invert;
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break;
          case 1: invert = y % 2 === 0; break;
          case 2: invert = x % 3 === 0; break;
          case 3: invert = (x + y) % 3 === 0; break;
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
          case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          default: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
        }
        if (!this.isFunction[y][x] && invert) this.modules[y][x] = !this.modules[y][x];
      }
    }
  }

  // Penalty rules N1 to N4 of the standard; the lowest score gives the most readable mask
  penalty() {
    const { size, modules } = this;
    let score = 0;
    const lineScore = (get) => {
      let total = 0;
      for (let a = 0; a < size; a += 1) {
        let run = 1;
        for (let b = 1; b < size; b += 1) {
          if (get(a, b) === get(a, b - 1)) {
            run += 1;
            if (run === 5) total += 3;
            else if (run > 5) total += 1;
          } else run = 1;
        }
        // finder-like pattern 1:1:3:1:1 with four light modules on one side
        for (let b = 0; b + 10 < size; b += 1) {
          const w = [];
          for (let k = 0; k < 11; k += 1) w.push(get(a, b + k) ? 1 : 0);
          const s = w.join('');
          if (s === '10111010000' || s === '00001011101') total += 40;
        }
      }
      return total;
    };
    score += lineScore((y, x) => modules[y][x]);
    score += lineScore((x, y) => modules[y][x]);
    for (let y = 0; y < size - 1; y += 1) {
      for (let x = 0; x < size - 1; x += 1) {
        const c = modules[y][x];
        if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) score += 3;
      }
    }
    let dark = 0;
    modules.forEach((row) => row.forEach((m) => { if (m) dark += 1; }));
    const total = size * size;
    score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
    return score;
  }
}

function utf8Bytes(text) {
  return Array.from(new TextEncoder().encode(text));
}

// Returns { size, isDark(x, y) } for the text. Throws if the text is too long for versions 1 to 20.
export function encodeQr(text) {
  const bytes = utf8Bytes(String(text));
  let ver = 1;
  for (; ver <= MAX_VERSION; ver += 1) {
    const countBits = ver < 10 ? 8 : 16;
    if (4 + countBits + bytes.length * 8 <= dataCodewords(ver) * 8) break;
  }
  if (ver > MAX_VERSION) throw new Error('The text is too long for a QR code.');

  // Bit stream: mode (0100), length, data, terminator, padding
  const bits = [];
  const push = (value, count) => { for (let i = count - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1); };
  push(0b0100, 4);
  push(bytes.length, ver < 10 ? 8 : 16);
  bytes.forEach((b) => push(b, 8));
  const capacityBits = dataCodewords(ver) * 8;
  push(0, Math.min(4, capacityBits - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) byte = (byte << 1) | bits[i + j];
    data.push(byte);
  }
  for (let pad = 0xec; data.length < dataCodewords(ver); pad ^= 0xec ^ 0x11) data.push(pad);

  const matrix = new Matrix(ver);
  matrix.drawFunctionPatterns();
  matrix.drawCodewords(addEccAndInterleave(data, ver));

  let bestMask = 0;
  let bestPenalty = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    matrix.applyMask(mask);
    matrix.drawFormat(mask);
    const p = matrix.penalty();
    if (p < bestPenalty) { bestPenalty = p; bestMask = mask; }
    matrix.applyMask(mask); // undo
  }
  matrix.applyMask(bestMask);
  matrix.drawFormat(bestMask);

  return { size: matrix.size, version: ver, isDark: (x, y) => x >= 0 && y >= 0 && x < matrix.size && y < matrix.size && matrix.modules[y][x] };
}

// SVG path covering every dark module (one square each) with a quiet zone of `border` modules
export function qrPath(qr, border = 4) {
  const parts = [];
  for (let y = 0; y < qr.size; y += 1) {
    for (let x = 0; x < qr.size; x += 1) {
      if (qr.isDark(x, y)) parts.push(`M${x + border},${y + border}h1v1h-1z`);
    }
  }
  return parts.join('');
}

// Paints the QR (with its quiet zone) onto a canvas context inside the square at (left, top) with the given pixel size
export function drawQr(ctx, qr, left, top, pixels, border = 4) {
  const total = qr.size + border * 2;
  const unit = pixels / total;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(left, top, pixels, pixels);
  ctx.fillStyle = '#000000';
  for (let y = 0; y < qr.size; y += 1) {
    for (let x = 0; x < qr.size; x += 1) {
      if (qr.isDark(x, y)) ctx.fillRect(left + (x + border) * unit, top + (y + border) * unit, Math.ceil(unit), Math.ceil(unit));
    }
  }
}
