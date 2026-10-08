import { AlertTriangle, Loader2 } from 'lucide-react';
import Button from './Button';
import { useDataStatus } from '../context/DataContext';

// Shows a loading or error screen until the first Supabase load has finished.
export default function DataGate({ children }) {
  const { loading, error, refresh } = useDataStatus();
  if (loading) {
    return (
      <div className="placeholder" role="status" aria-live="polite">
        <Loader2 size={32} className="spin" aria-hidden="true" />
        <p>Loading your data...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="placeholder" role="alert">
        <div className="placeholder-icon" aria-hidden="true"><AlertTriangle size={32} /></div>
        <h1>We could not load your data</h1>
        <p>{error}</p>
        <Button onClick={refresh}>Try again</Button>
      </div>
    );
  }
  return children;
}
