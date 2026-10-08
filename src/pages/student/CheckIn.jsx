import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Camera, CameraOff, CheckCircle2, KeyRound } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import InfoNote from '../../components/manage/InfoNote';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';
import useStudentData from '../../hooks/useStudentData';
import { checkInWithCode, extractCode, formatCode } from '../../services/attendanceService';

// Student QR check-in. The camera scan (where the browser supports it) and the typed code both end in the same
// database call, which re-checks the student, the registration, the event and the session.
export default function CheckIn() {
  const [params] = useSearchParams();
  const { refresh } = useStudentData();
  const [code, setCode] = useState(params.get('code') || '');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // { event_title }
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraNote, setCameraNote] = useState('');
  const [toast, showToast, closeToast] = useToast();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const busyRef = useRef(false);
  const supportsScan = typeof window !== 'undefined' && 'BarcodeDetector' in window && Boolean(navigator.mediaDevices?.getUserMedia);

  const submit = useCallback(async (value) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await checkInWithCode(extractCode(value));
      setDone(result);
      showToast('You are checked in.');
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [refresh, showToast]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);
  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = async () => {
    setCameraNote('');
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setScanning(true);
    } catch {
      setCameraNote('The camera is not available or permission was refused. Type the code below instead.');
    }
  };

  // Once the video element exists, attach the stream and look for a QR code a few times a second
  useEffect(() => {
    if (!scanning || !videoRef.current || !streamRef.current) return undefined;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.play().catch(() => {});
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    const timer = setInterval(async () => {
      if (busyRef.current || video.readyState < 2) return;
      try {
        const found = await detector.detect(video);
        if (found.length > 0) {
          clearInterval(timer);
          stopCamera();
          setCode(extractCode(found[0].rawValue));
          submit(found[0].rawValue);
        }
      } catch { /* a frame that cannot be read is skipped */ }
    }, 400);
    return () => clearInterval(timer);
  }, [scanning, submit, stopCamera]);

  return (
    <div className="dash-page">
      <PageHeader title="QR check-in" text="Mark yourself present at an event you registered for." crumb="QR check-in" />
      <InfoNote>Your organizer shows a QR code (and a short code) at the event. The system checks that you are registered, that the event is open for check-in and that you are not already marked present.</InfoNote>

      {done ? (
        <section className="card panel checkin-done" role="status">
          <CheckCircle2 size={40} aria-hidden="true" />
          <h2>You are checked in</h2>
          <p>You were marked present for <strong>{done.event_title}</strong>.</p>
          <div className="head-actions">
            <Button to="/student/attendance">View my attendance</Button>
            <Button variant="outline" onClick={() => { setDone(null); setCode(''); }}>Check in to another event</Button>
          </div>
        </section>
      ) : (
        <div className="dash-grid">
          <section className="card panel" aria-labelledby="scan-heading">
            <h2 id="scan-heading">Scan the QR code</h2>
            {supportsScan ? (
              <>
                {scanning ? (
                  <>
                    <video ref={videoRef} className="scan-video" muted playsInline aria-label="Camera view for scanning the QR code" />
                    <Button variant="outline" icon={CameraOff} onClick={stopCamera}>Stop camera</Button>
                  </>
                ) : (
                  <Button icon={Camera} onClick={startCamera} disabled={busy}>Open camera</Button>
                )}
                {cameraNote && <p className="form-error" role="alert">{cameraNote}</p>}
              </>
            ) : (
              <p className="panel-sub">This browser cannot scan QR codes from the camera. Open the camera app and scan the QR (it opens this page with the code filled in), or type the code on the right.</p>
            )}
          </section>

          <section className="card panel" aria-labelledby="code-heading">
            <h2 id="code-heading">Or type the code</h2>
            <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) submit(code); }}>
              <div className="field">
                <label htmlFor="ci-code">Attendance code</label>
                <input id="ci-code" type="text" value={code} onChange={(e) => { setCode(e.target.value); setError(''); }} placeholder="A1B2-C3D4-E5F6" autoComplete="off" autoCapitalize="characters" spellCheck="false" maxLength={80} className="mono" />
                {code && extractCode(code) !== code && <p className="field-hint">Code found in the link: {formatCode(extractCode(code))}</p>}
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <Button type="submit" icon={KeyRound} disabled={!code.trim() || busy}>{busy ? 'Checking in...' : 'Check in'}</Button>
            </form>
          </section>
        </div>
      )}
      <Toast message={toast} onDone={closeToast} />
    </div>
  );
}
