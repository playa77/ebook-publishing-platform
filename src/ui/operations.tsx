'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { OpsView, UsageReport } from '@/contracts/domain';
import { api } from './client';
export function Operations() {
    const [message, setMessage] = useState(''), [status, setStatus] = useState<OpsView>(), [usage, setUsage] = useState<UsageReport>();
    useEffect(() => { void Promise.all([api<OpsView>('/ops/status'), api<UsageReport>('/ops/usage?period=' + new Date().toISOString().slice(0, 7))]).then(([s, u]) => { setStatus(s); setUsage(u); }).catch(e => setMessage(e.message)); }, []);
    return <section><Link href="/projekte">Projekte</Link><h1>Betrieb</h1>{status && <p>Warteschlange: {status.queueDepth} · Ungeklärte Aufrufe: {status.ambiguousAttempts}</p>}{usage && <p>Verbrauch: {(Number(usage.organizationSpent) / 1000000).toFixed(2)} USD · Reserviert: {(Number(usage.organizationReserved) / 1000000).toFixed(2)} USD</p>}<form action={async (f) => { try {
        await api('/ops/invites', { email: String(f.get('email')) });
        setMessage('Einladung ist in der Warteschlange.');
    }
    catch (e) {
        setMessage((e as Error).message);
    } }}><label>Autor:in einladen<input name="email" type="email" required/></label><button>Einladen</button></form><form action={async (f) => { try {
        await api('/ops/accounts/' + f.get('id'), { status: 'disabled', reason: String(f.get('reason')) });
        setMessage('Konto deaktiviert.');
    }
    catch (e) {
        setMessage((e as Error).message);
    } }}><label>Konto-ID<input name="id" required/></label><label>Begründung<input name="reason" required/></label><button>Konto deaktivieren</button></form><p role="status">{message}</p></section>;
}
