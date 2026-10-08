import Breadcrumbs from './Breadcrumbs';

// Title + supporting text (+ breadcrumb and optional action). homePath defaults to the student dashboard; faculty and admin pages pass their own.
// crumb is a label, or an array of { label, to } when the page sits below another page.
export default function PageHeader({ title, text, crumb, action, homePath = '/student/dashboard' }) {
  return (
    <div className="page-head page-head-row">
      <div>
        {crumb && <Breadcrumbs items={[{ label: 'Dashboard', to: homePath }, ...(Array.isArray(crumb) ? crumb : [{ label: crumb }])]} />}
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {action}
    </div>
  );
}
