import { useEffect } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

// message is a string (success) or { text, type: 'error' }
export default function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onDone, typeof message === 'object' ? 6000 : 3500);
    return () => clearTimeout(timer);
  }, [message, onDone]);

  if (!message) return null;
  const isError = typeof message === 'object';
  const Icon = isError ? AlertCircle : CheckCircle2;
  return (
    <div className={`toast ${isError ? 'toast-error' : ''}`} role={isError ? 'alert' : 'status'}>
      <Icon size={20} aria-hidden="true" />
      <span>{isError ? message.text : message}</span>
    </div>
  );
}
