import { Search } from 'lucide-react';
import Button from '../Button';

// Search box + select filters used by the student-facing and organiser tables.
export default function FilterBar({ search, onSearch, placeholder = 'Search', searchLabel = 'Search', children, canClear = false, onClear }) {
  return (
    <div className="filter-bar">
      <div className="filter-search">
        <label htmlFor="filter-search-input" className="visually-hidden">{searchLabel}</label>
        <Search size={18} aria-hidden="true" />
        <input id="filter-search-input" type="search" value={search} placeholder={placeholder} onChange={(e) => onSearch(e.target.value)} />
      </div>
      {children}
      {canClear && <Button variant="ghost" size="sm" onClick={onClear}>Clear filters</Button>}
    </div>
  );
}

// options: ['A', 'B'] or [{ value, label }]. The first option ("all") uses the empty string.
export function FilterSelect({ id, label, value, onChange, options, allLabel }) {
  return (
    <div className="filter-select">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o;
          return <option key={opt.value} value={opt.value}>{opt.label}</option>;
        })}
      </select>
    </div>
  );
}
