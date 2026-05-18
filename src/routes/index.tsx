import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Users, ArrowRight, Share2, Check, Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import flownoteLogo from "@/assets/flownote-logo.svg";

export const Route = createFileRoute("/")({
  component: ClientsLanding,
});

type Client = { id: string; name: string; created_at: string };

const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const shortId = () => Math.random().toString(36).slice(2, 6);

function ClientsLanding() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<Client | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, created_at")
      .order("created_at", { ascending: true });
    if (error) console.warn("Failed to load clients:", error);
    setClients(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!clients) return [];
    const q = search.toLowerCase();
    return clients.filter(c => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
  }, [clients, search]);

  const createClient = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    const base = slugify(name) || "client";
    const existing = new Set((clients ?? []).map(c => c.id));
    let id = base;
    while (existing.has(id)) id = `${base}-${shortId()}`;
    const { error } = await supabase.from("clients").insert({ id, name });
    setBusy(false);
    if (error) {
      console.error(error);
      return;
    }
    setCreating(false);
    setNewName("");
    navigate({ to: "/w/$workspaceId", params: { workspaceId: id } });
  };

  const copyShare = async (id: string) => {
    const url = `${window.location.origin}/w/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(c => (c === id ? null : c)), 1500);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  const deleteClient = async (client: Client) => {
    // Best-effort cleanup of related workspace data.
    await supabase.from("workspaces").delete().eq("client_id", client.id);
    const { error } = await supabase.from("clients").delete().eq("id", client.id);
    if (error) console.warn(error);
    setConfirmDel(null);
    load();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 flex items-center justify-between gap-4">
          <img src={flownoteLogo} alt="FlowNote" className="h-10 w-auto" />
          <Button size="sm" onClick={() => { setNewName(""); setCreating(true); }}>
            <Plus className="w-4 h-4 mr-1" /> New client
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="flex items-center gap-2 mb-2 text-primary text-xs font-semibold uppercase tracking-[0.18em]">
          <Users className="w-3.5 h-3.5" /> Clients
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Pick a client workspace</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Each client has its own workspace with a shareable link. Anyone with the link can view and edit that client&apos;s snippets.
        </p>

        <div className="relative mb-6 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        {clients === null ? (
          <div className="text-sm text-muted-foreground">Loading clients…</div>
        ) : clients.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted grid place-items-center mx-auto mb-3">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-sm font-medium">No clients yet</div>
            <div className="text-xs text-muted-foreground mt-1 mb-4">
              Create your first client workspace to get started.
            </div>
            <Button size="sm" onClick={() => { setNewName(""); setCreating(true); }}>
              <Plus className="w-4 h-4 mr-1" /> New client
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground">No clients match &ldquo;{search}&rdquo;.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="group rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow flex flex-col"
              >
                <Link
                  to="/w/$workspaceId"
                  params={{ workspaceId: c.id }}
                  className="flex-1 min-w-0"
                >
                  <div className="text-base font-semibold truncate">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">
                    /w/{c.id}
                  </div>
                </Link>
                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border">
                  <button
                    onClick={() => copyShare(c.id)}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    title="Copy share link"
                  >
                    {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-primary" /> : <Share2 className="w-3.5 h-3.5" />}
                    {copiedId === c.id ? "Link copied" : "Copy link"}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setConfirmDel(c)}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded-md transition-colors"
                      title="Delete client"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      to="/w/$workspaceId"
                      params={{ workspaceId: c.id }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Open <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New client dialog */}
      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New client workspace</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); createClient(); }}
            className="space-y-3"
          >
            <label className="text-sm font-medium">Client name</label>
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Acme Inc."
            />
            <p className="text-xs text-muted-foreground">
              A shareable link will be generated automatically based on the name.
            </p>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
              <Button type="submit" disabled={busy || !newName.trim()}>
                {busy ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete client?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently deletes <span className="font-medium text-foreground">{confirmDel?.name}</span> and all of its workspace data. This can&apos;t be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDel(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmDel && deleteClient(confirmDel)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
