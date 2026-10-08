// Certificate files. The certificate is drawn on a canvas in the browser (so every language and name prints
// correctly), saved as one JPEG and wrapped in a single-page A4 landscape PDF written by hand below.
// No secrets are involved: the data comes from the certificate record the signed-in user is already allowed to read,
// and the QR code only contains the public verification link.
import { encodeQr, drawQr } from './qr';
import { formatDate } from './dates';
import { INSTITUTION_NAME } from './constants';

const W = 2339; // A4 landscape at 200 dpi
const H = 1654;
const NAVY = '#1b2559';
const BLUE = '#2563eb';
const GOLD = '#b8892b';
const INK = '#1f2937';
const MUTED = '#64748b';
const SERIF = 'Georgia, "Times New Roman", Times, serif';
const SANS = '"Segoe UI", Helvetica, Arial, sans-serif';

const TYPE_TEXT = {
  Participation: { title: 'Certificate of Participation', line: 'has successfully participated in' },
  Winner: { title: 'Certificate of Achievement', line: 'secured First Place (Winner) in' },
  'Runner-up': { title: 'Certificate of Achievement', line: 'secured Second Place (Runner-up) in' },
  Volunteer: { title: 'Certificate of Appreciation', line: 'volunteered and contributed to' },
};

// Shrinks the font until the text fits on one line (never below minSize)
function fitFont(ctx, text, family, weight, startSize, minSize, maxWidth) {
  let size = startSize;
  do {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth || size <= minSize) break;
    size -= 2;
  } while (size > minSize);
  return size;
}

function wrapLines(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  text.split(/\s+/).filter(Boolean).forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
  });
  if (line) lines.push(line);
  return lines;
}

function drawLogo(ctx, x, y, size) {
  const r = size / 4;
  ctx.fillStyle = NAVY;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + size, y, x + size, y + size, r);
  ctx.arcTo(x + size, y + size, x, y + size, r);
  ctx.arcTo(x, y + size, x, y, r);
  ctx.arcTo(x, y, x + size, y, r);
  ctx.closePath();
  ctx.fill();
  const u = size / 32;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.4 * u;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 8 * u, y + 20 * u);
  ctx.bezierCurveTo(x + 12 * u, y + 12 * u, x + 20 * u, y + 12 * u, x + 24 * u, y + 18 * u);
  ctx.moveTo(x + 8 * u, y + 14 * u);
  ctx.bezierCurveTo(x + 12 * u, y + 8 * u, x + 18 * u, y + 8 * u, x + 22 * u, y + 13 * u);
  ctx.stroke();
  ctx.fillStyle = '#60a5fa';
  ctx.beginPath();
  ctx.arc(x + 24 * u, y + 10 * u, 2.5 * u, 0, Math.PI * 2);
  ctx.fill();
}

function drawCorner(ctx, x, y, dx, dy) {
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, y + dy * 120);
  ctx.lineTo(x, y);
  ctx.lineTo(x + dx * 120, y);
  ctx.stroke();
}

// certificate: { id (number), type, issuedOn, verificationCode }, event: { title, date, venue }
export function renderCertificateCanvas({ certificate, studentName, event, verifyUrl }) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const copy = TYPE_TEXT[certificate.type] || TYPE_TEXT.Participation;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Paper and frame
  ctx.fillStyle = '#fffdf8';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 14;
  ctx.strokeRect(60, 60, W - 120, H - 120);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.strokeRect(90, 90, W - 180, H - 180);
  drawCorner(ctx, 120, 120, 1, 1);
  drawCorner(ctx, W - 120, 120, -1, 1);
  drawCorner(ctx, 120, H - 120, 1, -1);
  drawCorner(ctx, W - 120, H - 120, -1, -1);

  // Header: logo and institution
  drawLogo(ctx, W / 2 - 330, 170, 84);
  ctx.textAlign = 'left';
  ctx.fillStyle = NAVY;
  ctx.font = `700 64px ${SANS}`;
  ctx.fillText('CampusFlow', W / 2 - 222, 232);
  ctx.textAlign = 'center';
  ctx.fillStyle = MUTED;
  ctx.font = `500 30px ${SANS}`;
  ctx.fillText(INSTITUTION_NAME === 'CampusFlow' ? 'One platform for every college event' : INSTITUTION_NAME, W / 2, 300);

  // Title
  ctx.fillStyle = NAVY;
  ctx.font = `700 100px ${SERIF}`;
  ctx.fillText(copy.title, W / 2, 470);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 220, 510);
  ctx.lineTo(W / 2 + 220, 510);
  ctx.stroke();

  ctx.fillStyle = MUTED;
  ctx.font = `italic 400 38px ${SERIF}`;
  ctx.fillText('This certificate is proudly presented to', W / 2, 590);

  // Recipient
  const nameSize = fitFont(ctx, studentName, SERIF, '700', 128, 56, W - 520);
  ctx.fillStyle = INK;
  ctx.font = `700 ${nameSize}px ${SERIF}`;
  ctx.fillText(studentName, W / 2, 735);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 520, 770);
  ctx.lineTo(W / 2 + 520, 770);
  ctx.stroke();

  ctx.fillStyle = MUTED;
  ctx.font = `italic 400 40px ${SERIF}`;
  ctx.fillText(copy.line, W / 2, 850);

  // Event title (wraps to at most two lines, shrinks if needed)
  ctx.fillStyle = BLUE;
  let eventSize = 78;
  let lines;
  for (;;) {
    ctx.font = `700 ${eventSize}px ${SERIF}`;
    lines = wrapLines(ctx, event.title, W - 520);
    if (lines.length <= 2 || eventSize <= 44) break;
    eventSize -= 4;
  }
  lines = lines.slice(0, 2);
  const firstBaseline = lines.length === 1 ? 950 : 925;
  lines.forEach((line, i) => ctx.fillText(line, W / 2, firstBaseline + i * (eventSize + 10)));
  const afterTitle = firstBaseline + (lines.length - 1) * (eventSize + 10);

  ctx.fillStyle = INK;
  ctx.font = `400 40px ${SERIF}`;
  const where = event.venue ? `held on ${formatDate(event.date)} at ${event.venue}` : `held on ${formatDate(event.date)}`;
  ctx.fillText(where, W / 2, afterTitle + 80);

  // Footer: details (left), QR (centre), issuer (right)
  const footTop = 1120;
  ctx.textAlign = 'left';
  ctx.fillStyle = MUTED;
  ctx.font = `600 26px ${SANS}`;
  ctx.fillText('CERTIFICATE NUMBER', 230, footTop + 40);
  ctx.fillText('VERIFICATION CODE', 230, footTop + 150);
  ctx.fillText('DATE OF ISSUE', 230, footTop + 260);
  ctx.fillStyle = INK;
  ctx.font = `700 40px "Courier New", monospace`;
  ctx.fillText(certificate.id, 230, footTop + 90);
  ctx.fillText(certificate.verificationCode || '-', 230, footTop + 200);
  ctx.font = `600 38px ${SANS}`;
  ctx.fillText(formatDate(certificate.issuedOn), 230, footTop + 310);

  const qrSize = 300;
  const qrLeft = W / 2 - qrSize / 2;
  if (verifyUrl) {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(qrLeft - 8, footTop - 8, qrSize + 16, qrSize + 16);
    drawQr(ctx, encodeQr(verifyUrl), qrLeft, footTop, qrSize, 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = MUTED;
    ctx.font = `500 26px ${SANS}`;
    ctx.fillText('Scan to verify this certificate', W / 2, footTop + qrSize + 44);
  }

  ctx.textAlign = 'center';
  const signX = W - 520;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(signX - 260, footTop + 190);
  ctx.lineTo(signX + 260, footTop + 190);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = `700 38px ${SANS}`;
  ctx.fillText(INSTITUTION_NAME, signX, footTop + 245);
  ctx.fillStyle = MUTED;
  ctx.font = `500 28px ${SANS}`;
  ctx.fillText('Campus Events Office', signX, footTop + 290);

  ctx.fillStyle = MUTED;
  ctx.font = `400 24px ${SANS}`;
  ctx.fillText(`Verify authenticity at ${verifyUrl ? new URL(verifyUrl).origin : ''}/verify-certificate`, W / 2, H - 140);
  return canvas;
}

// ---------- A one page PDF around a JPEG ----------
const enc = (text) => new TextEncoder().encode(text);

// jpegBytes: Uint8Array of a baseline RGB JPEG. Returns a Uint8Array with the PDF file.
export function jpegToPdf(jpegBytes, pxWidth, pxHeight, { title = 'Certificate', pageWidth = 841.89, pageHeight = 595.28 } = {}) {
  const asciiTitle = title.replace(/[^\x20-\x7e]/g, '?').replace(/[()\\]/g, ' ');
  const content = `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Im0 Do Q`;
  const chunks = [];
  const offsets = [];
  let length = 0;
  const add = (bytes) => { chunks.push(bytes); length += bytes.length; };
  const startObject = (n) => { offsets[n] = length; };

  add(enc('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'));
  startObject(1); add(enc('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'));
  startObject(2); add(enc('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'));
  startObject(3); add(enc(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`));
  startObject(4);
  add(enc(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pxWidth} /Height ${pxHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`));
  add(jpegBytes);
  add(enc('\nendstream\nendobj\n'));
  startObject(5); add(enc(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`));
  startObject(6); add(enc(`6 0 obj\n<< /Title (${asciiTitle}) /Producer (CampusFlow) >>\nendobj\n`));

  const xrefAt = length;
  let xref = 'xref\n0 7\n0000000000 65535 f \n';
  for (let n = 1; n <= 6; n += 1) xref += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
  add(enc(`${xref}trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`));

  const out = new Uint8Array(length);
  let pos = 0;
  chunks.forEach((c) => { out.set(c, pos); pos += c.length; });
  return out;
}

function canvasToJpeg(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) { reject(new Error('The certificate image could not be created.')); return; }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, 'image/jpeg', 0.92);
  });
}

export async function buildCertificatePdf(details) {
  const canvas = renderCertificateCanvas(details);
  const jpeg = await canvasToJpeg(canvas);
  const pdf = jpegToPdf(jpeg, canvas.width, canvas.height, { title: `${details.certificate.type} certificate ${details.certificate.id}` });
  return new Blob([pdf], { type: 'application/pdf' });
}

// Builds the certificate and starts the browser download
export async function downloadCertificate(details) {
  const blob = await buildCertificatePdf(details);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `CampusFlow-Certificate-${String(details.certificate.id).replace(/[^A-Za-z0-9-]/g, '')}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
