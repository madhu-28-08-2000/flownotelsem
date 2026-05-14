import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Pencil, Trash2, Save, X, Code2, ExternalLink,
  Languages, Layers, FileCode, Search, MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Index,
});

type Card = { id: string; name: string; html: string; width: number };
type Segment = { id: string; name: string; cards: Card[] };
type Language = { id: string; name: string; segments: Segment[] };

const STORAGE_KEY = "html-snippet-manager-v2";
const uid = () => Math.random().toString(36).slice(2, 10);

const seed = (): Language[] => {
  const mkCards = (names: string[]): Card[] =>
    names.map((n) => ({ id: uid(), name: n, html: "", width: 380 }));
  const mkSegs = (): Segment[] => [
    { id: uid(), name: "C-Level", cards: mkCards(["Intro", "Follow-up 1", "Follow-up 2", "Follow-up 3", "Follow-up 4", "Follow-up 5"]) },
    { id: uid(), name: "HR", cards: mkCards(["Intro", "Follow-up"]) },
    { id: uid(), name: "VP", cards: mkCards(["Intro", "Follow-up"]) },
  ];
  return [
    { id: uid(), name: "German", segments: mkSegs() },
    { id: uid(), name: "English", segments: mkSegs() },
  ];
};

type PromptState = {
  title: string;
  label: string;
  initial?: string;
  onConfirm: (val: string) => void;
} | null;

function Index() {
  const [langs, setLangs] = useState<Language[]>([]);
  const [activeLang, setActiveLang] = useState<string>("");
  const [activeSeg, setActiveSeg] = useState<string>("");
  const [editor, setEditor] = useState<{ cardId: string; html: string; name: string } | null>(null);
  const [prompt, setPrompt] = useState<PromptState>(null);
  const [confirmDel, setConfirmDel] = useState<{ msg: string; onYes: () => void } | null>(null);
  const [search, setSearch] = useState("");
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data: Language[] = raw ? JSON.parse(raw) : seed();
      setLangs(data);
      setActiveLang(data[0]?.id ?? "");
      setActiveSeg(data[0]?.segments[0]?.id ?? "");
    } catch {
      const data = seed();
      setLangs(data);
      setActiveLang(data[0]?.id ?? "");
      setActiveSeg(data[0]?.segments[0]?.id ?? "");
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (loaded.current) localStorage.setItem(STORAGE_KEY, JSON.stringify(langs));
  }, [langs]);

  const lang = useMemo(() => langs.find((l) => l.id === activeLang), [langs, activeLang]);
  const seg = useMemo(() => lang?.segments.find((s) => s.id === activeSeg), [lang, activeSeg]);

  const update = (fn: (d: Language[]) => Language[]) => setLangs((d) => fn(structuredClone(d)));

  const askPrompt = (cfg: NonNullable<PromptState>) => setPrompt(cfg);
  const askConfirm = (msg: string, onYes: () => void) => setConfirmDel({ msg, onYes });

  const addLang = () =>
    askPrompt({
      title: "New language",
      label: "Language name",
      onConfirm: (name) => {
        const id = uid();
        update((d) => {
          d.push({ id, name, segments: [{ id: uid(), name: "New Segment", cards: [] }] });
          return d;
        });
        setActiveLang(id);
        setTimeout(() => setActiveSeg(""), 0);
      },
    });

  const renameLang = (id: string) => {
    const cur = langs.find((l) => l.id === id);
    askPrompt({
      title: "Rename language",
      label: "Language name",
      initial: cur?.name,
      onConfirm: (name) => update((d) => d.map((l) => (l.id === id ? { ...l, name } : l))),
    });
  };

  const delLang = (id: string) =>
    askConfirm("Delete this language and all its segments?", () => {
      update((d) => d.filter((l) => l.id !== id));
      if (activeLang === id) {
        const next = langs.find((l) => l.id !== id);
        setActiveLang(next?.id ?? "");
        setActiveSeg(next?.segments[0]?.id ?? "");
      }
    });

  const addSeg = () => {
    if (!lang) return;
    askPrompt({
      title: "New segment",
      label: "Segment name",
      onConfirm: (name) => {
        const id = uid();
        update((d) => {
          const L = d.find((l) => l.id === lang.id)!;
          L.segments.push({ id, name, cards: [] });
          return d;
        });
        setActiveSeg(id);
      },
    });
  };

  const renameSeg = (id: string) => {
    if (!lang) return;
    const cur = lang.segments.find((s) => s.id === id);
    askPrompt({
      title: "Rename segment",
      label: "Segment name",
      initial: cur?.name,
      onConfirm: (name) =>
        update((d) => {
          const L = d.find((l) => l.id === lang.id)!;
          L.segments = L.segments.map((s) => (s.id === id ? { ...s, name } : s));
          return d;
        }),
    });
  };

  const delSeg = (id: string) => {
    if (!lang) return;
    askConfirm("Delete this segment?", () => {
      update((d) => {
        const L = d.find((l) => l.id === lang.id)!;
        L.segments = L.segments.filter((s) => s.id !== id);
        return d;
      });
      if (activeSeg === id) setActiveSeg(lang.segments.find((s) => s.id !== id)?.id ?? "");
    });
  };

  const addCard = () => {
    if (!lang || !seg) return;
    askPrompt({
      title: "New HTML snippet",
      label: "Card name",
      initial: `Card ${seg.cards.length + 1}`,
      onConfirm: (name) =>
        update((d) => {
          const L = d.find((l) => l.id === lang.id)!;
          const S = L.segments.find((s) => s.id === seg.id)!;
          S.cards.push({ id: uid(), name, html: "", width: 380 });
          return d;
        }),
    });
  };

  const updateCard = (cardId: string, patch: Partial<Card>) => {
    if (!lang || !seg) return;
    update((d) => {
      const L = d.find((l) => l.id === lang.id)!;
      const S = L.segments.find((s) => s.id === seg.id)!;
      S.cards = S.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c));
      return d;
    });
  };

  const renameCard = (cardId: string) => {
    const cur = seg?.cards.find((c) => c.id === cardId);
    askPrompt({
      title: "Rename card",
      label: "Card name",
      initial: cur?.name,
      onConfirm: (name) => updateCard(cardId, { name }),
    });
  };

  const delCard = (cardId: string) =>
    askConfirm("Delete this card?", () => {
      if (!lang || !seg) return;
      update((d) => {
        const L = d.find((l) => l.id === lang.id)!;
        const S = L.segments.find((s) => s.id === seg.id)!;
        S.cards = S.cards.filter((c) => c.id !== cardId);
        return d;
      });
    });

  const openInBrowser = (html: string) => {
    const w = window.open("", "_blank");
    if (w) {
      w.document.open();
      w.document.write(html || "<!doctype html><html><body><p style='font-family:sans-serif;color:#666;padding:24px'>Empty snippet</p></body></html>");
      w.document.close();
    }
  };

  const filteredCards = useMemo(
    () =>
      seg?.cards.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())) ?? [],
    [seg, search]
  );

  const totalSnippets = langs.reduce(
    (acc, l) => acc + l.segments.reduce((a, s) => a + s.cards.length, 0),
    0
  );

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">Snippet Studio</div>
              <div className="text-xs text-muted-foreground">{totalSnippets} snippets</div>
            </div>
          </div>
        </div>

        <div className="px-3 py-3 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <Languages className="w-3.5 h-3.5" /> Languages
            </div>
            <button
              onClick={addLang}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Add language"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-0.5 mb-5">
            {langs.map((l) => (
              <div key={l.id} className="group flex items-center">
                <button
                  onClick={() => {
                    setActiveLang(l.id);
                    setActiveSeg(l.segments[0]?.id ?? "");
                  }}
                  className={cn(
                    "flex-1 text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-between",
                    activeLang === l.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <span className="truncate">{l.name}</span>
                  <span className="text-xs text-muted-foreground">{l.segments.length}</span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => renameLang(l.id)}>
                      <Pencil className="w-3.5 h-3.5 mr-2" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => delLang(l.id)} className="text-destructive">
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>

        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-border bg-card px-8 pt-8">
          <div className="flex items-start justify-between gap-4 pb-6">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-primary uppercase tracking-[0.18em] mb-2">
                {lang?.name ?? "—"}
              </div>
              <h1 className="text-4xl font-bold tracking-tight truncate">
                {seg?.name ?? "Select a segment"}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {seg?.cards.length ?? 0} snippet{(seg?.cards.length ?? 0) === 1 ? "" : "s"} in this segment
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search snippets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-64 h-9"
                />
              </div>
              <Button onClick={addCard} disabled={!seg} size="sm" className="h-9">
                <Plus className="w-4 h-4 mr-1" /> New snippet
              </Button>
            </div>
          </div>

          {lang && (
            <div className="flex items-center gap-1 overflow-x-auto -mb-px">
              {lang.segments.map((s) => (
                <div key={s.id} className="group relative flex items-center">
                  <button
                    onClick={() => setActiveSeg(s.id)}
                    className={cn(
                      "px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2",
                      activeSeg === s.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s.name}
                    <span className={cn(
                      "text-xs rounded-full px-1.5 py-0.5 tabular-nums",
                      activeSeg === s.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>{s.cards.length}</span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 mr-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => renameSeg(s.id)}>
                        <Pencil className="w-3.5 h-3.5 mr-2" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => delSeg(s.id)} className="text-destructive">
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
              <button
                onClick={addSeg}
                className="ml-1 mb-1 p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                title="Add segment"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-auto p-6 bg-background">
          {!seg ? (
            <EmptyState icon={Layers} title="No segment selected" hint="Pick a segment from the sidebar." />
          ) : filteredCards.length === 0 ? (
            <EmptyState
              icon={FileCode}
              title={search ? "No matches" : "No snippets yet"}
              hint={search ? "Try a different search." : "Click “New snippet” to get started."}
            />
          ) : (
            <div className="flex flex-wrap gap-5">
              {filteredCards.map((c) => (
                <article
                  key={c.id}
                  className="group rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden"
                  style={{ width: c.width }}
                >
                  <div className="flex items-center justify-between px-4 h-11 border-b border-border">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-primary/70" />
                      <h3 className="text-sm font-medium truncate">{c.name}</h3>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => renameCard(c.id)}>
                          <Pencil className="w-3.5 h-3.5 mr-2" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => delCard(c.id)} className="text-destructive">
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="relative bg-muted/30 h-48 overflow-hidden">
                    {c.html ? (
                      <iframe
                        srcDoc={c.html}
                        className="w-full h-full border-0 bg-white"
                        sandbox=""
                        title={c.name}
                      />
                    ) : (
                      <div className="h-full grid place-items-center text-xs text-muted-foreground">
                        Empty — click Edit to add HTML
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8"
                      onClick={() => setEditor({ cardId: c.id, html: c.html, name: c.name })}
                    >
                      <Code2 className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() => openInBrowser(c.html)}
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1" /> Preview
                    </Button>
                  </div>

                  <div className="px-4 pb-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="shrink-0">Width</span>
                    <Slider
                      value={[c.width]}
                      min={280}
                      max={780}
                      step={10}
                      onValueChange={(v) => updateCard(c.id, { width: v[0] })}
                      className="flex-1"
                    />
                    <span className="tabular-nums w-10 text-right">{c.width}px</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Editor */}
      <Dialog open={!!editor} onOpenChange={(o) => !o && setEditor(null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-5 py-4 border-b border-border">
            <DialogTitle>Edit HTML — {editor?.name}</DialogTitle>
          </DialogHeader>
          <textarea
            value={editor?.html ?? ""}
            onChange={(e) => editor && setEditor({ ...editor, html: e.target.value })}
            spellCheck={false}
            placeholder="<!doctype html>&#10;<html>&#10;  <body>...</body>&#10;</html>"
            className="flex-1 p-5 font-mono text-sm bg-muted/40 resize-none outline-none border-0"
          />
          <DialogFooter className="px-5 py-3 border-t border-border">
            <Button variant="ghost" onClick={() => setEditor(null)}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button
              onClick={() => {
                if (editor) updateCard(editor.cardId, { html: editor.html });
                setEditor(null);
              }}
            >
              <Save className="w-4 h-4 mr-1" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prompt */}
      <PromptDialog state={prompt} onClose={() => setPrompt(null)} />

      {/* Confirm delete */}
      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{confirmDel?.msg}</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDel(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                confirmDel?.onYes();
                setConfirmDel(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({
  icon: Icon, title, hint,
}: { icon: typeof FileCode; title: string; hint: string }) {
  return (
    <div className="h-full grid place-items-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-muted grid place-items-center mx-auto mb-3">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground mt-1">{hint}</div>
      </div>
    </div>
  );
}

function PromptDialog({
  state, onClose,
}: { state: PromptState; onClose: () => void }) {
  const [val, setVal] = useState("");
  useEffect(() => { setVal(state?.initial ?? ""); }, [state]);
  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{state?.title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = val.trim();
            if (!trimmed) return;
            state?.onConfirm(trimmed);
            onClose();
          }}
          className="space-y-3"
        >
          <label className="text-sm font-medium">{state?.label}</label>
          <Input autoFocus value={val} onChange={(e) => setVal(e.target.value)} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
