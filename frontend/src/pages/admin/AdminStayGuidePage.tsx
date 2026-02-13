import { useEffect, useMemo, useState } from "react";
import type { AdminStayGuide, AdminStayGuideItem, AdminStayGuideSection } from "../../api/adminStayGuide";
import {
  createItem,
  createSection,
  deleteItem,
  deleteSection,
  getAdminStayGuide,
  patchAdminStayGuide,
  patchItem,
  patchSection,
  regenerateStayGuideToken,
} from "../../api/adminStayGuide";

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-2xl border border-amber-200/70 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-amber-200/60",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        "w-full rounded-2xl border border-amber-200/70 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-amber-200/60",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function ButtonWhite(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold",
        "bg-white text-slate-900 hover:bg-amber-50 transition",
        "border border-amber-200/70 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function DangerButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold",
        "bg-white text-rose-700 hover:bg-rose-50 transition",
        "border border-rose-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

export default function AdminStayGuidePage() {
  const [guide, setGuide] = useState<AdminStayGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // meta form state
  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [published, setPublished] = useState(true);

  // create section
  const [newSectionTitle, setNewSectionTitle] = useState("");

  async function refresh() {
    setError(null);
    setLoading(true);
    try {
      const g = await getAdminStayGuide();
      setGuide(g);
      setTitle(g.title ?? "");
      setIntro(g.intro ?? "");
      setPublished(Boolean(g.published));
    } catch (e: any) {
      setError(e?.message || "Failed to load guide");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const guideLink = useMemo(() => {
    if (!guide?.token) return "";
    return `/stay-guide/${guide.token}`;
  }, [guide?.token]);

  async function saveMeta() {
    if (!guide) return;
    setSavingMeta(true);
    setError(null);
    try {
      await patchAdminStayGuide({ title, intro, published });
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to save");
    } finally {
      setSavingMeta(false);
    }
  }

  async function regenToken() {
    setError(null);
    try {
      await regenerateStayGuideToken();
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to regenerate token");
    }
  }

  async function addSection() {
    if (!newSectionTitle.trim()) return;
    setError(null);
    try {
      await createSection({ title: newSectionTitle.trim(), sortOrder: (guide?.sections?.length ?? 0) * 10 });
      setNewSectionTitle("");
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to create section");
    }
  }

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 pt-24 pb-12">
        <div className="rounded-3xl border border-amber-200/70 bg-white p-8 shadow-sm">
          <p className="text-slate-700">Loading stay guide…</p>
        </div>
      </main>
    );
  }

  if (!guide) {
    return (
      <main className="max-w-6xl mx-auto px-4 pt-24 pb-12">
        <div className="rounded-3xl border border-amber-200/70 bg-white p-8 shadow-sm">
          <p className="text-slate-900 font-semibold">No guide loaded.</p>
          {error ? <p className="mt-2 text-rose-700 text-sm">{error}</p> : null}
          <div className="mt-4">
            <ButtonWhite onClick={refresh}>Retry</ButtonWhite>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 pt-24 pb-12">
      <header className="rounded-[28px] border border-amber-200/70 bg-white shadow-sm overflow-hidden">
        <div className="p-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-amber-700">STAY GUIDE (UNIVERSAL)</p>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-[-0.01em] text-slate-900">
            Admin — Stay Guide
          </h1>

          {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-700">TITLE</p>
              <div className="mt-2">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <p className="mt-5 text-xs font-semibold tracking-wide text-slate-700">INTRO</p>
              <div className="mt-2">
                <Textarea rows={4} value={intro} onChange={(e) => setIntro(e.target.value)} />
              </div>

              <label className="mt-5 inline-flex items-center gap-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                />
                Published
              </label>

              <div className="mt-5 flex flex-wrap gap-2">
                <ButtonWhite onClick={saveMeta} disabled={savingMeta}>
                  {savingMeta ? "Saving…" : "Save"}
                </ButtonWhite>
                <ButtonWhite onClick={regenToken}>Regenerate Token</ButtonWhite>
              </div>
            </div>

            <div className="rounded-3xl border border-amber-200/60 bg-amber-50/30 p-6">
              <p className="text-xs font-semibold tracking-wide text-slate-700">GUEST LINK (QR)</p>
              <div className="mt-2">
                <div className="rounded-2xl border border-amber-200/70 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm break-all">
                  {guideLink}
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-600">
                Use this URL in the QR codes and emails. Universal for all villas.
              </p>
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" />
      </header>

      {/* Sections */}
      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-6 w-[3px] rounded-full bg-amber-200/80" />
            <h2 className="text-[18px] md:text-[19px] font-semibold tracking-[0.06em] text-slate-900 uppercase">
              Sections
            </h2>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-amber-200/70 via-slate-200 to-transparent" />
        </div>

        <div className="mt-6 rounded-3xl border border-amber-200/70 bg-white p-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="flex-1">
              <Input
                placeholder="New section title (e.g. Food & Drinks)"
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
              />
            </div>
            <ButtonWhite onClick={addSection} disabled={!newSectionTitle.trim()}>
              Add Section
            </ButtonWhite>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {guide.sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              onChange={refresh}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function SectionCard({ section, onChange }: { section: AdminStayGuideSection; onChange: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [sortOrder, setSortOrder] = useState(String(section.sortOrder ?? 0));
  const [error, setError] = useState<string | null>(null);

  // new item form
  const [newItem, setNewItem] = useState({
    title: "",
    type: "",
    description: "",
    heroImageUrl: "",
    imageUrls: "",
    href: "",
    mapsHref: "",
    mapsEmbedSrc: "",
    locationLabel: "",
    sortOrder: String((section.items?.length ?? 0) * 10),
  });

  async function saveSection() {
    setError(null);
    try {
      await patchSection(section.id, { title, sortOrder: Number(sortOrder) });
      setEditing(false);
      await onChange();
    } catch (e: any) {
      setError(e?.message || "Failed to save section");
    }
  }

  async function removeSection() {
    if (!confirm("Delete this section and all its items?")) return;
    setError(null);
    try {
      await deleteSection(section.id);
      await onChange();
    } catch (e: any) {
      setError(e?.message || "Failed to delete section");
    }
  }

  async function addItem() {
    if (!newItem.title.trim() || !newItem.type.trim() || !newItem.description.trim() || !newItem.heroImageUrl.trim()) {
      setError("Item requires title, type, description, heroImageUrl");
      return;
    }
    setError(null);
    try {
      const parsedImages = newItem.imageUrls
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      await createItem(section.id, {
        title: newItem.title.trim(),
        type: newItem.type.trim(),
        description: newItem.description.trim(),
        heroImageUrl: newItem.heroImageUrl.trim(),
        imageUrls: parsedImages.length ? parsedImages : undefined,
        href: newItem.href.trim() ? newItem.href.trim() : null,
        mapsHref: newItem.mapsHref.trim() ? newItem.mapsHref.trim() : null,
        mapsEmbedSrc: newItem.mapsEmbedSrc.trim() ? newItem.mapsEmbedSrc.trim() : null,
        locationLabel: newItem.locationLabel.trim() ? newItem.locationLabel.trim() : null,
        sortOrder: Number(newItem.sortOrder || 0),
      });

      setNewItem({
        title: "",
        type: "",
        description: "",
        heroImageUrl: "",
        imageUrls: "",
        href: "",
        mapsHref: "",
        mapsEmbedSrc: "",
        locationLabel: "",
        sortOrder: String((section.items?.length ?? 0) * 10 + 10),
      });

      await onChange();
    } catch (e: any) {
      setError(e?.message || "Failed to create item");
    }
  }

  return (
    <div className="rounded-3xl border border-amber-200/70 bg-white shadow-sm overflow-hidden">
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-6 w-[3px] rounded-full bg-amber-200/80" />
            <h3 className="text-lg font-semibold text-slate-900 truncate">{section.title}</h3>
          </div>

          <div className="flex flex-wrap gap-2">
            <ButtonWhite onClick={() => setEditing((v) => !v)}>
              {editing ? "Close" : "Edit Section"}
            </ButtonWhite>
            <DangerButton onClick={removeSection}>Delete</DangerButton>
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}

        {editing ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <p className="text-xs font-semibold tracking-wide text-slate-700">SECTION TITLE</p>
              <div className="mt-2">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-700">SORT ORDER</p>
              <div className="mt-2">
                <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
              </div>
            </div>

            <div className="md:col-span-3 mt-2">
              <ButtonWhite onClick={saveSection}>Save Section</ButtonWhite>
            </div>
          </div>
        ) : null}
      </div>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" />

      {/* Items list */}
      <div className="p-6">
        <p className="text-xs font-semibold tracking-[0.18em] text-amber-700">RECOMMENDATIONS</p>

        <div className="mt-4 space-y-4">
          {section.items.map((it) => (
            <ItemRow key={it.id} item={it} onChange={onChange} />
          ))}
        </div>

        {/* Add item */}
        <div className="mt-6 rounded-3xl border border-amber-200/60 bg-amber-50/30 p-5">
          <p className="text-sm font-semibold text-slate-900">Add recommendation</p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-700">TITLE</p>
              <div className="mt-2">
                <Input value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-700">TYPE (badge)</p>
              <div className="mt-2">
                <Input value={newItem.type} onChange={(e) => setNewItem({ ...newItem, type: e.target.value })} />
              </div>
            </div>

            <div className="md:col-span-2">
              <p className="text-xs font-semibold tracking-wide text-slate-700">DESCRIPTION</p>
              <div className="mt-2">
                <Textarea rows={3} value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} />
              </div>
            </div>

            <div className="md:col-span-2">
              <p className="text-xs font-semibold tracking-wide text-slate-700">HERO IMAGE URL</p>
              <div className="mt-2">
                <Input value={newItem.heroImageUrl} onChange={(e) => setNewItem({ ...newItem, heroImageUrl: e.target.value })} />
              </div>
              <p className="mt-2 text-xs text-slate-600">
                For local public images use paths like: <span className="font-mono">/images/V_IMG_2764.webp</span>
              </p>
            </div>

            <div className="md:col-span-2">
              <p className="text-xs font-semibold tracking-wide text-slate-700">SLIDES (one per line)</p>
              <div className="mt-2">
                <Textarea
                  rows={3}
                  value={newItem.imageUrls}
                  onChange={(e) => setNewItem({ ...newItem, imageUrls: e.target.value })}
                  placeholder={"/images/710531680.jpg\n/images/725674867.jpg"}
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-700">WEBSITE / INSTAGRAM (optional)</p>
              <div className="mt-2">
                <Input value={newItem.href} onChange={(e) => setNewItem({ ...newItem, href: e.target.value })} />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-700">GOOGLE MAPS LINK (optional)</p>
              <div className="mt-2">
                <Input value={newItem.mapsHref} onChange={(e) => setNewItem({ ...newItem, mapsHref: e.target.value })} />
              </div>
            </div>

            <div className="md:col-span-2">
              <p className="text-xs font-semibold tracking-wide text-slate-700">MAP EMBED SRC (optional)</p>
              <div className="mt-2">
                <Input value={newItem.mapsEmbedSrc} onChange={(e) => setNewItem({ ...newItem, mapsEmbedSrc: e.target.value })} />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-700">LOCATION LABEL (optional)</p>
              <div className="mt-2">
                <Input value={newItem.locationLabel} onChange={(e) => setNewItem({ ...newItem, locationLabel: e.target.value })} />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-700">SORT ORDER</p>
              <div className="mt-2">
                <Input value={newItem.sortOrder} onChange={(e) => setNewItem({ ...newItem, sortOrder: e.target.value })} />
              </div>
            </div>

            <div className="md:col-span-2 mt-2">
              <ButtonWhite onClick={addItem}>Add Recommendation</ButtonWhite>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemRow({ item, onChange }: { item: AdminStayGuideItem; onChange: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState({
    title: item.title,
    type: item.type,
    description: item.description,
    heroImageUrl: item.heroImageUrl,
    imageUrls: (item.imageUrls ?? []).join("\n"),
    href: item.href ?? "",
    mapsHref: item.mapsHref ?? "",
    mapsEmbedSrc: item.mapsEmbedSrc ?? "",
    locationLabel: item.locationLabel ?? "",
    sortOrder: String(item.sortOrder ?? 0),
  });

  async function save() {
    setError(null);
    try {
      const parsedImages = draft.imageUrls
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      await patchItem(item.id, {
        title: draft.title.trim(),
        type: draft.type.trim(),
        description: draft.description.trim(),
        heroImageUrl: draft.heroImageUrl.trim(),
        imageUrls: parsedImages.length ? parsedImages : null,
        href: draft.href.trim() ? draft.href.trim() : null,
        mapsHref: draft.mapsHref.trim() ? draft.mapsHref.trim() : null,
        mapsEmbedSrc: draft.mapsEmbedSrc.trim() ? draft.mapsEmbedSrc.trim() : null,
        locationLabel: draft.locationLabel.trim() ? draft.locationLabel.trim() : null,
        sortOrder: Number(draft.sortOrder || 0),
      });

      setOpen(false);
      await onChange();
    } catch (e: any) {
      setError(e?.message || "Failed to save item");
    }
  }

  async function remove() {
    if (!confirm("Delete this recommendation?")) return;
    setError(null);
    try {
      await deleteItem(item.id);
      await onChange();
    } catch (e: any) {
      setError(e?.message || "Failed to delete item");
    }
  }

  return (
    <div className="rounded-3xl border border-amber-200/70 bg-white shadow-sm">
      <div className="p-5">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
            <p className="mt-1 text-xs text-slate-600">
              {item.type} • sort {item.sortOrder}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ButtonWhite onClick={() => setOpen((v) => !v)}>{open ? "Close" : "Edit"}</ButtonWhite>
            <DangerButton onClick={remove}>Delete</DangerButton>
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}

        {open ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-700">TITLE</p>
              <div className="mt-2">
                <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-700">TYPE</p>
              <div className="mt-2">
                <Input value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} />
              </div>
            </div>

            <div className="md:col-span-2">
              <p className="text-xs font-semibold tracking-wide text-slate-700">DESCRIPTION</p>
              <div className="mt-2">
                <Textarea rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
            </div>

            <div className="md:col-span-2">
              <p className="text-xs font-semibold tracking-wide text-slate-700">HERO IMAGE URL</p>
              <div className="mt-2">
                <Input value={draft.heroImageUrl} onChange={(e) => setDraft({ ...draft, heroImageUrl: e.target.value })} />
              </div>
            </div>

            <div className="md:col-span-2">
              <p className="text-xs font-semibold tracking-wide text-slate-700">SLIDES (one per line)</p>
              <div className="mt-2">
                <Textarea rows={3} value={draft.imageUrls} onChange={(e) => setDraft({ ...draft, imageUrls: e.target.value })} />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-700">VISIT LINK</p>
              <div className="mt-2">
                <Input value={draft.href} onChange={(e) => setDraft({ ...draft, href: e.target.value })} />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-700">MAPS LINK</p>
              <div className="mt-2">
                <Input value={draft.mapsHref} onChange={(e) => setDraft({ ...draft, mapsHref: e.target.value })} />
              </div>
            </div>

            <div className="md:col-span-2">
              <p className="text-xs font-semibold tracking-wide text-slate-700">MAP EMBED SRC</p>
              <div className="mt-2">
                <Input value={draft.mapsEmbedSrc} onChange={(e) => setDraft({ ...draft, mapsEmbedSrc: e.target.value })} />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-700">LOCATION LABEL</p>
              <div className="mt-2">
                <Input value={draft.locationLabel} onChange={(e) => setDraft({ ...draft, locationLabel: e.target.value })} />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-700">SORT ORDER</p>
              <div className="mt-2">
                <Input value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })} />
              </div>
            </div>

            <div className="md:col-span-2 mt-2">
              <ButtonWhite onClick={save}>Save</ButtonWhite>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}


