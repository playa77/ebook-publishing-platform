'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './client';
export function AuthForm({ mode }: {
    mode: 'sign-in' | 'password' | 'verify';
}) {
    const router = useRouter(), started = useRef(false);
    const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
    useEffect(() => { if (mode !== 'verify' || started.current)
        return; started.current = true; void (async () => { await Promise.resolve(); const p = new URLSearchParams(location.search), tokenHash = p.get('token_hash') ?? p.get('token'); const type = p.get('type') === 'recovery' ? 'recovery' : 'invite'; history.replaceState(null, '', '/zugang'); if (!tokenHash) {
        setMessage('Der Bestätigungslink fehlt oder ist abgelaufen.');
        return;
    } void api('/auth/verify', { tokenHash, type }).then(() => { router.push('/passwort'); }).catch(e => setMessage(e.message)); })(); }, [mode, router]);
    async function submit(form: FormData, recovery = false) { setBusy(true); setMessage(''); try {
        const email = String(form.get('email') ?? ''), password = String(form.get('password') ?? '');
        await api('/auth/' + (recovery ? 'recovery' : mode), recovery ? { email } : mode === 'password' ? { password } : { email, password });
        if (recovery)
            setMessage('Falls ein passendes Konto besteht, erhältst du eine E-Mail.');
        else
            router.push('/projekte');
    }
    catch (e) {
        setMessage((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    return <section><h1>{mode === 'sign-in' ? 'Anmelden' : mode === 'password' ? 'Passwort festlegen' : 'Zugang bestätigen'}</h1>{mode !== 'verify' && <form action={submit}>{mode === 'sign-in' && <label>E-Mail<input name="email" type="email" autoComplete="email" required/></label>}<label>Passwort<input name="password" type="password" minLength={mode === 'password' ? 12 : 1} maxLength={256} autoComplete={mode === 'password' ? 'new-password' : 'current-password'} required/></label><button disabled={busy}>{busy ? 'Bitte warten …' : 'Weiter'}</button>{mode === 'sign-in' && <button type="button" disabled={busy} onClick={e => { const f = e.currentTarget.closest('form'); if (f)
        void submit(new FormData(f), true); }}>Passwort vergessen</button>}</form>}<p role="status">{message}</p></section>;
}
