import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

// items: [{ label, to }] - the last item is the current page and has no link
export default function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.label}>
              {last ? <span aria-current="page">{item.label}</span> : <Link to={item.to}>{item.label}</Link>}
              {!last && <ChevronRight size={14} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
