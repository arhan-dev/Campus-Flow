import Badge from '../Badge';
import { lifecycleVariant } from '../../lib/constants';

// Event lifecycle stage as a badge. The stage is always written out, so colour is never the only signal.
export default function LifecycleBadge({ status }) {
  return <Badge variant={lifecycleVariant[status] || 'neutral'} dot>{status}</Badge>;
}
