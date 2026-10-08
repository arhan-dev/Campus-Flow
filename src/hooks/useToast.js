import { useCallback, useState } from 'react';

// Helper for the Toast component: const [message, showToast, closeToast] = useToast();
// showToast('Saved') shows a success message. showToast('Could not save', 'error') shows an error message.
export default function useToast() {
  const [message, setMessage] = useState('');
  const show = useCallback((text, type = 'success') => setMessage(type === 'error' ? { text, type } : text), []);
  const close = useCallback(() => setMessage(''), []);
  return [message, show, close];
}
