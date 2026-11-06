'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ProjectRow, CommitReceipt,ProjectView,AllowanceView } from '@/contracts/domain';
import { api } from './client';
export function Workspace({ projectId }: {
    projectId?: string;
}) {
    const router = useRouter();
    const [projects, setProjects] = useState<ProjectRow[]>([]), [message, setMessage] = useState(''),[allowance,setAllowance]=useState<AllowanceView>();
    async function load() { try {
        if(projectId){const view=await api<ProjectView>('/projects/'+projectId);setProjects([view.project]);setAllowance(view.allowances);}
        else
            setProjects((await api<{
                items: ProjectRow[];
            }>('/projects')).items);
    }
    catch (e) {
        setMessage((e as Error).message);
    } }
    useEffect(() => { void Promise.resolve().then(load); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps
    const project = projects[0];
    return <section><nav><Link href="/projekte">Projekte</Link> · <Link href="/betrieb">Betrieb</Link> · <button onClick={() => { void api('/auth/sign-out', {}).then(() => router.push('/anmelden')); }}>Abmelden</button></nav><h1>{projectId ? project?.title || 'Projekt einrichten' : 'Deine Projekte'}</h1><p role="status">{message}</p>{!projectId ? <><ul>{projects.map(p => <li key={p.id}><Link href={'/projekte/' + p.id}>{p.title || 'Ohne Titel'}</Link> {p.phase === 'archived' ? '(archiviert)' : ''}</li>)}</ul><form action={async (f) => { try {
        const mode = String(f.get('mode'));
        const r = await api<CommitReceipt>('/projects', { title: String(f.get('title')), mode, genre: mode === 'nf' ? 'nonfiction' : 'other' });
        router.push('/projekte/' + r.entityIds[0]);
    }
    catch (e) {
        setMessage((e as Error).message);
    } }}><label>Arbeitstitel (optional)<input name="title" maxLength={250}/></label><label>Buchart<select name="mode"><option value="fic">Roman</option><option value="nf">Sachbuch</option></select></label><button>Projekt anlegen</button></form></> : project && <><p>Dein Manuskript ist privat. {allowance&&<>Du nutzt {allowance.activeProjects} von {allowance.activeProjectsLimit} aktiven Projekten. </>} Kosten und Reservierungen bleiben auch nach dem Archivieren erhalten.</p><form action={async (f) => { try {
        await api('/projects/' + project.id, { title: String(f.get('title')), authorName: String(f.get('author')) }, { method: 'PATCH', version: project.contentVersion });
        await load();
        setMessage('Gespeichert.');
    }
    catch (e) {
        setMessage((e as Error).message);
    } }}><label>Titel<input name="title" defaultValue={project.title} maxLength={250}/></label><label>Autor:innenname<input name="author" defaultValue={project.authorName} maxLength={150}/></label><button disabled={project.phase === 'archived'}>Speichern</button></form><label>Originaldatei hochladen (Text, Markdown oder DOCX)<input type="file" accept=".txt,.md,.docx" disabled={project.phase === 'archived'} onChange={async (e) => { const file = e.target.files?.[0]; if (!file)
        return; try {
        await api('/projects/' + project.id + '/imports', file, { raw: true, mime: file.name.endsWith('.md') ? 'text/markdown' : file.type || 'text/plain', version: project.contentVersion });
        setMessage('Originaldatei privat gespeichert. Die Auswertung folgt in der nächsten Phase.');
    }
    catch (e) {
        setMessage((e as Error).message);
    } }}/></label><button disabled={project.phase === 'archived'} onClick={async () => { try {
        await api('/projects/' + project.id + '/archive', { archived: true }, { version: project.contentVersion });
        await load();
    }
    catch (e) {
        setMessage((e as Error).message);
    } }}>Archivieren</button></>}</section>;
}
