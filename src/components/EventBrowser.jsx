import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useSearchParams } from 'react-router-dom';

import {
  Search,
  SearchX,
  ChevronRight,
} from 'lucide-react';

import EventCard from './EventCard';
import Button from './Button';
import EmptyState from './EmptyState';

import {
  SORT_OPTIONS,
  STATUS_LIST,
} from '../lib/constants';

import {
  eventMatchesSearch,
  getEventStatus,
  isFinished,
  sortEvents,
} from '../lib/eventUtils';

import { useCatalog } from '../context/DataContext';

const DEFAULTS = {
  q: '',
  category: 'All',
  status: 'All',
  sort: 'upcoming',
};

// Search, filters, sorting and the event grid.
// Used by the public Events page and the student Events page.
export default function EventBrowser({
  gridClass = 'grid-3',
}) {
  const {
    events,
    categoryNames: CATEGORY_LIST,
    loading,
    error,
    refresh,
  } = useCatalog();

  const [params, setParams] =
    useSearchParams();

  const chipRowRef = useRef(null);

  const [showChipHint, setShowChipHint] =
    useState(false);

  const query =
    params.get('q') ||
    DEFAULTS.q;

  const category =
    CATEGORY_LIST.includes(
      params.get('category')
    )
      ? params.get('category')
      : DEFAULTS.category;

  const status =
    STATUS_LIST.includes(
      params.get('status')
    )
      ? params.get('status')
      : DEFAULTS.status;

  const sort =
    SORT_OPTIONS.some(
      (o) => o.value === params.get('sort')
    )
      ? params.get('sort')
      : DEFAULTS.sort;

  const setParam = (key, value) => {
    const next =
      new URLSearchParams(params);

    if (value === DEFAULTS[key]) {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    setParams(next, {
      replace: true,
    });
  };

  const clearFilters = () =>
    setParams({}, {
      replace: true,
    });

  const results = useMemo(() => {
    const matching = events.filter(
      (e) =>
        eventMatchesSearch(e, query) &&
        (category === 'All' ||
          e.category === category) &&
        (status === 'All' ||
          getEventStatus(e) === status)
    );

    return sortEvents(
      matching,
      sort
    );
  }, [
    events,
    query,
    category,
    status,
    sort,
  ]);

  const upcomingCount =
    events.filter(
      (e) => !isFinished(e)
    ).length;

  const hasFilters =
    Boolean(query) ||
    category !== 'All' ||
    status !== 'All' ||
    sort !== DEFAULTS.sort;

  // Show the arrow only when the category row
  // can actually scroll.
  useEffect(() => {
    const row = chipRowRef.current;

    if (!row) {
      return undefined;
    }

    const updateHint = () => {
      const canScroll =
        row.scrollWidth >
        row.clientWidth + 2;

      const atEnd =
        row.scrollLeft +
          row.clientWidth >=
        row.scrollWidth - 4;

      setShowChipHint(
        canScroll && !atEnd
      );
    };

    updateHint();

    row.addEventListener(
      'scroll',
      updateHint,
      {
        passive: true,
      }
    );

    window.addEventListener(
      'resize',
      updateHint
    );

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateHint)
        : null;

    observer?.observe(row);

    return () => {
      row.removeEventListener(
        'scroll',
        updateHint
      );

      window.removeEventListener(
        'resize',
        updateHint
      );

      observer?.disconnect();
    };
  }, [CATEGORY_LIST.length]);

  if (loading) {
    return (
      <p
        className="panel-sub"
        role="status"
      >
        Loading events...
      </p>
    );
  }

  if (error) {
    return (
      <div
        className="empty-state"
        role="alert"
      >
        <h2>
          We could not load events
        </h2>

        <p>{error}</p>

        <Button
          variant="outline"
          onClick={refresh}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <>
      <p className="events-total">
        {events.length} events listed,{' '}
        {upcomingCount} upcoming
      </p>

      <div className="filters">

        {/* Search */}
        <div className="search-field">
          <label
            htmlFor="event-search"
            className="visually-hidden"
          >
            Search events
          </label>

          <Search
            size={20}
            aria-hidden="true"
          />

          <input
            id="event-search"
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder="Search events..."
            value={query}
            onChange={(e) =>
              setParam(
                'q',
                e.target.value
              )
            }
          />
        </div>

        {/* Categories */}
        <div className="chip-row-shell">
          <div
            ref={chipRowRef}
            className="chip-row"
            role="group"
            aria-label="Filter by category"
          >
            {[
              'All',
              ...CATEGORY_LIST,
            ].map((c) => (
              <button
                key={c}
                type="button"
                className={`chip ${
                  category === c
                    ? 'is-active'
                    : ''
                }`}
                aria-pressed={
                  category === c
                }
                onClick={() =>
                  setParam(
                    'category',
                    c
                  )
                }
              >
                {c}
              </button>
            ))}
          </div>

          {showChipHint && (
            <span
              className="chip-scroll-hint"
              aria-hidden="true"
            >
              <ChevronRight size={17} />
            </span>
          )}
        </div>

        {/* Status / sorting */}
        <div className="select-row">

          <div className="field">
            <label htmlFor="filter-status">
              Status
            </label>

            <select
              id="filter-status"
              value={status}
              onChange={(e) =>
                setParam(
                  'status',
                  e.target.value
                )
              }
            >
              <option value="All">
                All statuses
              </option>

              {STATUS_LIST.map(
                (s) => (
                  <option
                    key={s}
                    value={s}
                  >
                    {s}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="field">
            <label htmlFor="filter-sort">
              Sort by
            </label>

            <select
              id="filter-sort"
              value={sort}
              onChange={(e) =>
                setParam(
                  'sort',
                  e.target.value
                )
              }
            >
              {SORT_OPTIONS.map(
                (o) => (
                  <option
                    key={o.value}
                    value={o.value}
                  >
                    {o.label}
                  </option>
                )
              )}
            </select>
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="clear-btn"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          )}

        </div>
      </div>

      <p
        className="result-count"
        aria-live="polite"
      >
        Showing {results.length} of{' '}
        {events.length} events
      </p>

      {results.length > 0 ? (
        <div
          className={`grid ${gridClass}`}
        >
          {results.map((event) => (
            <EventCard
              key={event.id}
              event={event}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={SearchX}
          title="No events found"
          text="Try changing your search or filters."
          actionLabel="Clear Filters"
          onAction={clearFilters}
        />
      )}
    </>
  );
}
