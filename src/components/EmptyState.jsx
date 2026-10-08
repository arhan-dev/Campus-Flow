import Button from './Button';

export default function EmptyState({ icon: Icon, title, text, actionLabel, actionTo, onAction }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={36} aria-hidden="true" />}
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {actionLabel && (
        <Button variant="outline" to={actionTo} onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
