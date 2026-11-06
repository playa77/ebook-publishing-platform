import { Workspace } from '@/ui/workspace';
export default async function Page({ params }: {
    params: Promise<{
        projectId: string;
    }>;
}) { const { projectId } = await params; return <Workspace projectId={projectId}/>; }
