import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Pencil, Trash2, Save, X, Code2, ExternalLink,
  Languages, Layers, FileCode, Search, MoreHorizontal,
  Smartphone, Monitor, GitCompare, Upload, Check, StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import flownoteLogo from "@/assets/flownote-logo.svg";

export const Route = createFileRoute("/")({
  component: Index,
});

type Note = { id: string; text: string; createdAt: number };
type Card = { id: string; name: string; html: string; width: number; height: number; notes: Note[] };
type Segment = { id: string; name: string; cards: Card[] };
type Language = { id: string; name: string; segments: Segment[] };

const STORAGE_KEY = "html-snippet-manager-v4";
const uid = () => Math.random().toString(36).slice(2, 10);

const seed = (): Language[] => {
  const mkCards = (names: string[]): Card[] =>
    names.map((n) => ({ id: uid(), name: n, html: "", width: 380, height: 270, notes: [] }));
  const mkSegs = (): Segment[] => [
    { id: uid(), name: "HR", cards: mkCards(["Intro", "Follow-up"]) },
    { id: uid(), name: "VP", cards: mkCards(["Intro", "Follow-up"]) },
  ];
  return [
    { id: uid(), name: "English", segments: mkSegs() },
  ];
};

type PromptState = {
  title: string;
  label: string;
  initial?: string;
  onConfirm: (val: string) => void;
} | null;

type DevicePreview = { html: string; name: string; device: "mobile" | "desktop" } | null;

function Index() {
  const [langs, setLangs] = useState<Language[]>([]);
  const [activeLang, setActiveLang] = useState<string>("");
  const [activeSeg, setActiveSeg] = useState<string>("");
  const [editor, setEditor] = useState<{ cardId: string; html: string; name: string } | null>(null);
  const [prompt, setPrompt] = useState<PromptState>(null);
  const [confirmDel, setConfirmDel] = useState<{ msg: string; onYes: () => void } | null>(null);
  const [search, setSearch] = useState("");
  const [devicePreview, setDevicePreview] = useState<DevicePreview>(null);
  const [comparePicker, setComparePicker] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareView, setCompareView] = useState<string[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data: Language[] = raw ? JSON.parse(raw) : seed();
      // migrate: ensure height + notes exist
      data.forEach(l => l.segments.forEach(s => s.cards.forEach(c => {
        if (typeof c.height !== "number") c.height = 270;
        if (!Array.isArray(c.notes)) c.notes = [];
      })));
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

  // Flat index of all snippets for compare lookup
  const allSnippets = useMemo(() => {
    const out: { id: string; name: string; html: string; lang: string; seg: string }[] = [];
    langs.forEach(l => l.segments.forEach(s => s.cards.forEach(c => {
      out.push({ id: c.id, name: c.name, html: c.html, lang: l.name, seg: s.name });
    })));
    return out;
  }, [langs]);

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
          S.cards.push({ id: uid(), name, html: "", width: 380, height: 270 });
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

  const handleDropFile = async (file: File) => {
    if (!editor) return;
    const text = await file.text();
    setEditor({ ...editor, html: text });
  };

  const handlePickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && editor) {
      const text = await f.text();
      setEditor({ ...editor, html: text });
    }
    e.target.value = "";
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

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="px-4 py-4 border-b border-border">
          <img src={flownoteLogo} alt="FlowNote" className="block w-[calc(100%-1rem)] mx-auto h-auto" />
          <div className="mt-2 text-xs text-muted-foreground text-right">{totalSnippets} snippets</div>
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
                  className="pl-9 w-56 h-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => { setCompareIds([]); setComparePicker(true); }}
              >
                <GitCompare className="w-4 h-4 mr-1" /> Compare
              </Button>
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
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-primary/70 shrink-0" />
                      <h3 className="text-lg font-semibold truncate tracking-tight">{c.name}</h3>
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

                  <div className="relative bg-muted/30 overflow-hidden" style={{ height: c.height }}>
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

                  <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-2 flex-wrap">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8"
                      onClick={() => setEditor({ cardId: c.id, html: c.html, name: c.name })}
                    >
                      <Code2 className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        title="Mobile preview"
                        onClick={() => setDevicePreview({ html: c.html, name: c.name, device: "mobile" })}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        title="Desktop preview"
                        onClick={() => setDevicePreview({ html: c.html, name: c.name, device: "desktop" })}
                      >
                        <Monitor className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        title="Open in new tab"
                        onClick={() => openInBrowser(c.html)}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="px-4 pb-3 space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 w-12">Width</span>
                      <Slider
                        value={[c.width]}
                        min={280}
                        max={780}
                        step={10}
                        onValueChange={(v) => updateCard(c.id, { width: v[0] })}
                        className="flex-1"
                      />
                      <span className="tabular-nums w-12 text-right">{c.width}px</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 w-12">Height</span>
                      <Slider
                        value={[c.height]}
                        min={160}
                        max={720}
                        step={10}
                        onValueChange={(v) => updateCard(c.id, { height: v[0] })}
                        className="flex-1"
                      />
                      <span className="tabular-nums w-12 text-right">{c.height}px</span>
                    </div>
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
          <DialogHeader className="px-5 py-4 border-b border-border flex-row items-center justify-between space-y-0">
            <DialogTitle>Edit HTML — {editor?.name}</DialogTitle>
            <label className="inline-flex items-center gap-1.5 text-xs font-medium text-primary cursor-pointer hover:underline mr-6">
              <Upload className="w-3.5 h-3.5" /> Upload HTML file
              <input type="file" accept=".html,.htm,text/html" className="hidden" onChange={handlePickFile} />
            </label>
          </DialogHeader>
          <div
            className="flex-1 relative"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleDropFile(f);
            }}
          >
            <textarea
              value={editor?.html ?? ""}
              onChange={(e) => editor && setEditor({ ...editor, html: e.target.value })}
              spellCheck={false}
              placeholder="<!doctype html>&#10;<html>&#10;  <body>...</body>&#10;</html>&#10;&#10;Tip: drop an .html file here to import."
              className="w-full h-full p-5 font-mono text-sm bg-muted/40 resize-none outline-none border-0"
            />
            {dragOver && (
              <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary grid place-items-center pointer-events-none">
                <div className="text-sm font-medium text-primary flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Drop HTML file to import
                </div>
              </div>
            )}
          </div>
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

      {/* Device preview */}
      <Dialog open={!!devicePreview} onOpenChange={(o) => !o && setDevicePreview(null)}>
        <DialogContent className="max-w-[min(95vw,1280px)] h-[88vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-5 py-4 border-b border-border flex-row items-center justify-between space-y-0">
            <DialogTitle className="flex items-center gap-2">
              {devicePreview?.device === "mobile" ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
              {devicePreview?.name} — {devicePreview?.device === "mobile" ? "Mobile (375×812)" : "Desktop (1280×800)"}
            </DialogTitle>
            <div className="flex items-center gap-1 mr-6">
              <Button
                variant={devicePreview?.device === "mobile" ? "secondary" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => devicePreview && setDevicePreview({ ...devicePreview, device: "mobile" })}
              >
                <Smartphone className="w-3.5 h-3.5 mr-1" /> Mobile
              </Button>
              <Button
                variant={devicePreview?.device === "desktop" ? "secondary" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => devicePreview && setDevicePreview({ ...devicePreview, device: "desktop" })}
              >
                <Monitor className="w-3.5 h-3.5 mr-1" /> Desktop
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted/30 grid place-items-center p-6">
            {devicePreview && (
              <div
                className="bg-white rounded-lg shadow-lg overflow-hidden border border-border"
                style={{
                  width: devicePreview.device === "mobile" ? 375 : 1280,
                  height: devicePreview.device === "mobile" ? 812 : 800,
                  maxWidth: "100%",
                }}
              >
                <iframe
                  srcDoc={devicePreview.html || "<p style='font-family:sans-serif;color:#666;padding:24px'>Empty snippet</p>"}
                  className="w-full h-full border-0"
                  sandbox=""
                  title={devicePreview.name}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Compare picker */}
      <Dialog open={comparePicker} onOpenChange={(o) => { if (!o) setComparePicker(false); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Compare snippets</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Select 2 to 4 snippets to view side by side.
            <span className="ml-2 font-medium text-foreground">{compareIds.length} selected</span>
          </p>
          <div className="flex-1 overflow-auto -mx-6 px-6 space-y-4">
            {langs.map(l => (
              <div key={l.id}>
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">{l.name}</div>
                {l.segments.map(s => (
                  <div key={s.id} className="mb-3">
                    <div className="text-xs text-muted-foreground mb-1 ml-1">{s.name}</div>
                    <div className="space-y-1">
                      {s.cards.length === 0 && (
                        <div className="text-xs text-muted-foreground italic ml-1">No snippets</div>
                      )}
                      {s.cards.map(c => {
                        const checked = compareIds.includes(c.id);
                        const disabled = !checked && compareIds.length >= 4;
                        return (
                          <label
                            key={c.id}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-md border text-sm cursor-pointer transition-colors",
                              checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                              disabled && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              disabled={disabled}
                              onCheckedChange={() => toggleCompare(c.id)}
                            />
                            <span className="flex-1 truncate">{c.name}</span>
                            {!c.html && <span className="text-xs text-muted-foreground">(empty)</span>}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setComparePicker(false)}>Cancel</Button>
            <Button
              disabled={compareIds.length < 2}
              onClick={() => {
                setCompareView(compareIds);
                setComparePicker(false);
              }}
            >
              <Check className="w-4 h-4 mr-1" /> Compare ({compareIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare view */}
      <Dialog open={!!compareView} onOpenChange={(o) => !o && setCompareView(null)}>
        <DialogContent className="max-w-[98vw] h-[92vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-5 py-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="w-4 h-4" /> Comparing {compareView?.length ?? 0} snippets
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted/30 p-4">
            <div
              className="grid gap-4 h-full"
              style={{ gridTemplateColumns: `repeat(${compareView?.length ?? 1}, minmax(0, 1fr))` }}
            >
              {compareView?.map(id => {
                const s = allSnippets.find(x => x.id === id);
                if (!s) return null;
                return (
                  <div key={id} className="flex flex-col bg-card rounded-lg border border-border overflow-hidden min-w-0">
                    <div className="px-4 py-3 border-b border-border bg-card">
                      <div className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                        {s.lang} · {s.seg}
                      </div>
                      <div className="text-base font-semibold truncate">{s.name}</div>
                    </div>
                    <div className="flex-1 bg-white">
                      {s.html ? (
                        <iframe srcDoc={s.html} className="w-full h-full border-0" sandbox="" title={s.name} />
                      ) : (
                        <div className="h-full grid place-items-center text-xs text-muted-foreground">Empty snippet</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
