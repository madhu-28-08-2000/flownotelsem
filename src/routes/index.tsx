import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Save, X, Code2, Eye } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

type Card = { id: string; name: string; html: string; width: number };
type Segment = { id: string; name: string; cards: Card[] };
type Language = { id: string; name: string; segments: Segment[] };

const STORAGE_KEY = "html-snippet-manager-v1";
const uid = () => Math.random().toString(36).slice(2, 10);

const seed = (): Language[] => {
  const mkCards = (names: string[]): Card[] =>
    names.map((n) => ({ id: uid(), name: n, html: "", width: 360 }));
  const mkSegs = (): Segment[] => [
    { id: uid(), name: "C_Level", cards: mkCards(["Intro", "Follow-up", "Follow-up-2", "Follow-up-3", "Follow-up-4", "Follow-up-5"]) },
    { id: uid(), name: "HR", cards: mkCards(["Intro", "Follow-up"]) },
    { id: uid(), name: "VP", cards: mkCards(["Intro", "Follow-up"]) },
  ];
  return [
    { id: uid(), name: "German", segments: mkSegs() },
    { id: uid(), name: "English", segments: mkSegs() },
  ];
};

function Index() {
  const [langs, setLangs] = useState<Language[]>([]);
  const [activeLang, setActiveLang] = useState<string>("");
  const [activeSeg, setActiveSeg] = useState<string>("");
  const [editor, setEditor] = useState<{ cardId: string; html: string } | null>(null);
  const [preview, setPreview] = useState<Card | null>(null);
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

  // mutations
  const update = (fn: (d: Language[]) => Language[]) => setLangs((d) => fn(structuredClone(d)));

  const addLang = () => {
    const name = prompt("Language name?");
    if (!name) return;
    const id = uid();
    update((d) => {
      d.push({ id, name, segments: [{ id: uid(), name: "New Segment", cards: [] }] });
      return d;
    });
    setActiveLang(id);
  };
  const renameLang = (id: string) => {
    const cur = langs.find((l) => l.id === id);
    const name = prompt("Rename language", cur?.name);
    if (!name) return;
    update((d) => d.map((l) => (l.id === id ? { ...l, name } : l)));
  };
  const delLang = (id: string) => {
    if (!confirm("Delete language?")) return;
    update((d) => d.filter((l) => l.id !== id));
  };

  const addSeg = () => {
    const name = prompt("Segment name?");
    if (!name || !lang) return;
    const id = uid();
    update((d) => {
      const L = d.find((l) => l.id === lang.id)!;
      L.segments.push({ id, name, cards: [] });
      return d;
    });
    setActiveSeg(id);
  };
  const renameSeg = (id: string) => {
    if (!lang) return;
    const cur = lang.segments.find((s) => s.id === id);
    const name = prompt("Rename segment", cur?.name);
    if (!name) return;
    update((d) => {
      const L = d.find((l) => l.id === lang.id)!;
      L.segments = L.segments.map((s) => (s.id === id ? { ...s, name } : s));
      return d;
    });
  };
  const delSeg = (id: string) => {
    if (!lang || !confirm("Delete segment?")) return;
    update((d) => {
      const L = d.find((l) => l.id === lang.id)!;
      L.segments = L.segments.filter((s) => s.id !== id);
      return d;
    });
  };

  const addCard = () => {
    if (!lang || !seg) return;
    const name = prompt("Card name?", `Card ${seg.cards.length + 1}`);
    if (!name) return;
    update((d) => {
      const L = d.find((l) => l.id === lang.id)!;
      const S = L.segments.find((s) => s.id === seg.id)!;
      S.cards.push({ id: uid(), name, html: "", width: 360 });
      return d;
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
  const delCard = (cardId: string) => {
    if (!lang || !seg || !confirm("Delete card?")) return;
    update((d) => {
      const L = d.find((l) => l.id === lang.id)!;
      const S = L.segments.find((s) => s.id === seg.id)!;
      S.cards = S.cards.filter((c) => c.id !== cardId);
      return d;
    });
  };
  const renameCard = (cardId: string) => {
    const cur = seg?.cards.find((c) => c.id === cardId);
    const name = prompt("Rename card", cur?.name);
    if (!name) return;
    updateCard(cardId, { name });
  };

  const openInBrowser = (html: string) => {
    const w = window.open("", "_blank");
    if (w) {
      w.document.open();
      w.document.write(html || "<p>Empty</p>");
      w.document.close();
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Languages */}
      <aside className="w-44 border-r border-border p-3 space-y-2 overflow-y-auto">
        <button onClick={addLang} className="w-full text-left text-sm text-[var(--accent-orange)] hover:opacity-80 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> add language
        </button>
        {langs.map((l) => (
          <div key={l.id} className="group relative">
            <button
              onClick={() => {
                setActiveLang(l.id);
                setActiveSeg(l.segments[0]?.id ?? "");
              }}
              className="w-full text-left rounded-xl border-2 border-[var(--card-border)] px-3 py-2.5 text-sm font-medium transition-colors"
              style={{
                background:
                  l.id === activeLang
                    ? "var(--lang-active)"
                    : "transparent",
              }}
            >
              {l.name}
            </button>
            <div className="absolute right-1 top-1 hidden group-hover:flex gap-0.5">
              <button onClick={() => renameLang(l.id)} className="p-1 rounded hover:bg-black/10"><Pencil className="w-3 h-3" /></button>
              <button onClick={() => delLang(l.id)} className="p-1 rounded hover:bg-black/10"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
      </aside>

      {/* Segments */}
      <aside className="w-56 border-r border-border p-3 space-y-2 overflow-y-auto">
        <button onClick={addSeg} disabled={!lang} className="w-full text-left text-sm text-[var(--accent-orange)] hover:opacity-80 flex items-center gap-1 disabled:opacity-30">
          <Plus className="w-3.5 h-3.5" /> add Segment
        </button>
        {lang?.segments.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSeg(s.id)}
            className="w-full rounded-xl border-2 border-[var(--card-border)] px-3 py-2.5 text-sm flex items-center justify-between transition-colors"
            style={{ background: s.id === activeSeg ? "var(--lang-hover)" : "transparent" }}
          >
            <span>{s.name}</span>
            <span className="flex items-center gap-1 text-xs text-[var(--accent-orange)]">
              <span onClick={(e) => { e.stopPropagation(); renameSeg(s.id); }} className="hover:underline cursor-pointer">edit</span>
              <X onClick={(e) => { e.stopPropagation(); delSeg(s.id); }} className="w-3 h-3 hover:opacity-70" />
            </span>
          </button>
        ))}
      </aside>

      {/* Cards */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">
            {lang?.name ?? "—"} <span className="text-muted-foreground">/</span> {seg?.name ?? "—"}
          </h1>
          <button onClick={addCard} disabled={!seg} className="text-sm text-[var(--accent-orange)] hover:opacity-80 flex items-center gap-1 disabled:opacity-30">
            <Plus className="w-4 h-4" /> add HTML
          </button>
        </div>

        <div className="flex flex-wrap gap-5">
          {seg?.cards.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border-2 border-[var(--card-border)] p-3 flex flex-col gap-2 bg-card"
              style={{ width: c.width }}
            >
              <div className="rounded-xl border-2 border-[var(--card-border)] px-3 py-1.5 text-[var(--accent-orange)] font-medium flex items-center justify-between">
                <span className="truncate">{c.name}</span>
                <div className="flex gap-1">
                  <button onClick={() => renameCard(c.id)} title="Rename"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => delCard(c.id)} title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="rounded-2xl border-2 border-[var(--card-border)] min-h-[180px] p-2 relative bg-white text-black overflow-hidden">
                {c.html ? (
                  <iframe
                    srcDoc={c.html}
                    className="w-full h-[180px] border-0"
                    sandbox=""
                    title={c.name}
                  />
                ) : (
                  <div className="text-xs text-muted-foreground p-2">No HTML yet — click edit.</div>
                )}
                <div className="absolute bottom-2 right-2 flex gap-1">
                  <button
                    onClick={() => setEditor({ cardId: c.id, html: c.html })}
                    className="text-xs px-2 py-1 rounded-lg bg-[var(--lang-hover)] border border-[var(--card-border)] flex items-center gap-1"
                  >
                    <Code2 className="w-3 h-3" /> edit
                  </button>
                  <button
                    onClick={() => openInBrowser(c.html)}
                    className="text-xs px-2 py-1 rounded-lg bg-[var(--lang-hover)] border border-[var(--card-border)] flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" /> view on browser
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>width</span>
                <input
                  type="range"
                  min={260}
                  max={780}
                  value={c.width}
                  onChange={(e) => updateCard(c.id, { width: Number(e.target.value) })}
                  className="flex-1"
                />
                <span className="w-10 text-right">{c.width}px</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {editor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
          <div className="bg-card rounded-2xl border-2 border-[var(--card-border)] w-full max-w-4xl h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h2 className="font-semibold">Edit HTML</h2>
              <button onClick={() => setEditor(null)}><X className="w-5 h-5" /></button>
            </div>
            <textarea
              value={editor.html}
              onChange={(e) => setEditor({ ...editor, html: e.target.value })}
              spellCheck={false}
              className="flex-1 p-4 font-mono text-sm bg-muted resize-none outline-none"
              placeholder="<html>...</html>"
            />
            <div className="p-3 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => setEditor(null)}
                className="px-4 py-2 rounded-lg border border-border text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateCard(editor.cardId, { html: editor.html });
                  setEditor(null);
                }}
                className="px-4 py-2 rounded-lg bg-[var(--accent-orange)] text-white text-sm flex items-center gap-1"
              >
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
