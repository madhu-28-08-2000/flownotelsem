import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Workspace from "@/components/Workspace";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/w/$workspaceId")({
  component: WorkspacePage,
});

function WorkspacePage() {
  const { workspaceId } = Route.useParams();
  const [name, setName] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setName(null);
    setNotFound(false);
    (async () => {
      const { data } = await supabase
        .from("clients")
        .select("name")
        .eq("id", workspaceId)
        .maybeSingle();
      if (cancelled) return;
      if (data?.name) setName(data.name);
      else setNotFound(true);
    })();
    return () => { cancelled = true; };
  }, [workspaceId]);

  if (notFound) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground p-6">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold mb-2">Workspace not found</h1>
          <p className="text-sm text-muted-foreground mb-4">
            No client matches <code className="px-1.5 py-0.5 rounded bg-muted">{workspaceId}</code>.
          </p>
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to clients
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!name) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-muted-foreground text-sm">
        Loading workspace…
      </div>
    );
  }

  return <Workspace workspaceId={workspaceId} workspaceName={name} />;
}
