import { SearchX } from 'lucide-react';
import EmptyState from '../../components/EmptyState';

// Shown for unknown routes inside the event organiser areas, so the sidebar stays available.
export default function ManageNotFound({ home }) {
  return <EmptyState icon={SearchX} title="Page not found" text="This page does not exist." actionLabel="Back to dashboard" actionTo={home} />;
}
