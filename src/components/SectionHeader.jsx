export default function SectionHeader({ title, text, align = 'center', action, as: Tag = 'h2' }) {
  return (
    <div className={`section-header section-header-${align}`}>
      <div>
        <Tag>{title}</Tag>
        {text && <p>{text}</p>}
      </div>
      {action}
    </div>
  );
}
