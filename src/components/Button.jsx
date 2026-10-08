import { Link } from 'react-router-dom';

// variant: primary | secondary | outline | danger | ghost
// size: sm | md | lg
export default function Button({
  variant = 'primary',
  size = 'md',
  to,
  href,
  icon: Icon,
  iconRight: IconRight,
  fullWidth = false,
  className = '',
  children,
  ...rest
}) {
  const classes = `btn btn-${variant} btn-${size} ${fullWidth ? 'btn-block' : ''} ${className}`.trim();
  const content = (
    <>
      {Icon && <Icon size={18} aria-hidden="true" />}
      <span>{children}</span>
      {IconRight && <IconRight size={18} aria-hidden="true" />}
    </>
  );

  if (to) return <Link to={to} className={classes} {...rest}>{content}</Link>;
  if (href) return <a href={href} className={classes} {...rest}>{content}</a>;
  return <button type="button" className={classes} {...rest}>{content}</button>;
}
