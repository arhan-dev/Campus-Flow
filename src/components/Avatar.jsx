const COLORS = ['#1b2559', '#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777'];

export default function Avatar({ name = 'User', size = 36, src }) {
  if (src) return <img className="avatar" src={src} alt="" style={{ width: size, height: size, objectFit: 'cover' }} />;
  const initials = name
    .replace(/^(Dr|Prof)\.?\s+/i, '')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const color = COLORS[name.length % COLORS.length];
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
