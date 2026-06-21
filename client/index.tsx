import {
  Link,
  Route,
  Router,
  Routes,
  SignInWithGoogle,
  signOut,
  useAuth,
  useMutation,
  useQuery
} from "lakebed/client";
import { useState } from "preact/hooks";
import { cleanBody, type GuestbookEntry, type PrivateNote, type RuntimeStatus } from "../shared/content";

function Avatar({ label, picture }: { label: string; picture?: string }) {
  const initial = label.trim().slice(0, 1).toUpperCase() || "?";

  if (picture) {
    return (
      <img
        alt=""
        className="h-9 w-9 shrink-0 rounded-full border border-neutral-800 bg-neutral-900 object-cover"
        referrerPolicy="no-referrer"
        src={picture}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-sm font-semibold text-neutral-200"
    >
      {initial}
    </span>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-800 px-4 py-8 text-center text-sm text-neutral-500">
      {children}
    </div>
  );
}

function PrivateNotes() {
  const notes = useQuery<PrivateNote[]>("privateNotes");
  const addPrivateNote = useMutation<[body: string], void>("addPrivateNote");
  const setPrivateNoteDone = useMutation<[id: string, done: boolean], void>("setPrivateNoteDone");
  const deletePrivateNote = useMutation<[id: string], void>("deletePrivateNote");

  async function onSubmit(event: Event) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const body = cleanBody(String(data.get("body") ?? ""));
    if (!body) {
      return;
    }

    await addPrivateNote(body);
    form.reset();
  }

  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-300">ctx.auth.userId</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Private notes</h2>
        </div>
        <span className="rounded-md border border-neutral-800 px-2 py-1 font-mono text-xs text-neutral-500">
          {notes.length} rows
        </span>
      </div>

      <form className="mb-5 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => void onSubmit(event)}>
        <input
          className="min-w-0 flex-1 rounded-lg border border-neutral-800 bg-black px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-emerald-300"
          name="body"
          placeholder="Private row text"
        />
        <button className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200" type="submit">
          Add note
        </button>
      </form>

      {notes.length ? (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg border border-neutral-800 bg-black p-4">
              <div className="flex items-start gap-3">
                <input
                  checked={note.done}
                  className="mt-1 h-4 w-4 accent-emerald-300"
                  type="checkbox"
                  onChange={(event) => void setPrivateNoteDone(note.id, (event.currentTarget as HTMLInputElement).checked)}
                />
                <div className="min-w-0 flex-1">
                  <p className={note.done ? "text-sm leading-6 text-neutral-500 line-through" : "text-sm leading-6 text-neutral-100"}>
                    {note.body}
                  </p>
                  <p className="mt-2 truncate font-mono text-[11px] text-neutral-600">{note.id}</p>
                </div>
                <button
                  className="rounded-md border border-neutral-800 px-2 py-1 text-xs text-neutral-400 transition hover:border-white hover:text-white"
                  type="button"
                  onClick={() => void deletePrivateNote(note.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState>No private rows for this identity yet.</EmptyState>
      )}
    </section>
  );
}

function Guestbook() {
  const entries = useQuery<GuestbookEntry[]>("guestbookEntries");
  const signGuestbook = useMutation<[body: string], void>("signGuestbook");

  async function onSubmit(event: Event) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const body = cleanBody(String(data.get("body") ?? ""), 280);
    if (!body) {
      return;
    }

    await signGuestbook(body);
    form.reset();
  }

  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-sky-300">shared table</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Guestbook</h2>
        </div>
        <span className="rounded-md border border-neutral-800 px-2 py-1 font-mono text-xs text-neutral-500">
          {entries.length} rows
        </span>
      </div>

      <form className="mb-5 flex flex-col gap-3" onSubmit={(event) => void onSubmit(event)}>
        <textarea
          className="min-h-24 rounded-lg border border-neutral-800 bg-black px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-sky-300"
          name="body"
          placeholder="Shared guestbook row"
        />
        <button className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200" type="submit">
          Sign guestbook
        </button>
      </form>

      {entries.length ? (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-lg border border-neutral-800 bg-black p-4">
              <div className="flex gap-3">
                <Avatar label={entry.authorName} picture={entry.authorPicture} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-neutral-100">{entry.authorName}</p>
                    <span className="font-mono text-[11px] text-neutral-600">{entry.authorId}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-neutral-300">{entry.body}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState>No shared rows yet.</EmptyState>
      )}
    </section>
  );
}

function StatusPanel() {
  const runtimeStatus = useQuery<RuntimeStatus>("runtimeStatus");
  const [endpointStatus, setEndpointStatus] = useState("not checked");

  async function checkEndpoint() {
    const response = await fetch("/api/status");
    setEndpointStatus(response.ok ? JSON.stringify(await response.json(), null, 2) : "error " + response.status);
  }

  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-5">
      <div className="mb-5">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">runtime</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Status</h2>
      </div>
      <button
        className="rounded-lg border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-200 transition hover:border-white hover:text-white"
        type="button"
        onClick={() => void checkEndpoint()}
      >
        Check endpoint
      </button>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <pre className="overflow-auto rounded-lg border border-neutral-800 bg-black p-4 text-xs leading-5 text-neutral-400">
          {JSON.stringify(runtimeStatus, null, 2)}
        </pre>
        <pre className="overflow-auto rounded-lg border border-neutral-800 bg-black p-4 text-xs leading-5 text-neutral-400">
          {endpointStatus}
        </pre>
      </div>
    </section>
  );
}

function HomePage() {
  const auth = useAuth();
  const authLabel = auth.displayName || "Guest";
  const authStatus = auth.isLoading ? "checking session" : auth.isGuest ? "guest session" : "google session";

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 border-b border-neutral-900 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-emerald-300">Lakebed auth + db</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">Lakebed Tour</h1>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2">
            {!auth.isLoading ? <Avatar label={authLabel} picture={auth.picture} /> : null}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-100">{authLabel}</p>
              <p className="font-mono text-xs text-neutral-500">{authStatus}</p>
            </div>
            {!auth.isLoading && auth.isGuest ? (
              <SignInWithGoogle className="ml-2 shrink-0 rounded-lg border border-neutral-700 px-3 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white hover:text-white" />
            ) : !auth.isLoading ? (
              <button className="ml-2 shrink-0 text-sm font-semibold text-neutral-400 transition hover:text-white" type="button" onClick={() => signOut()}>
                Sign out
              </button>
            ) : null}
          </div>
        </header>

        <nav className="mb-6 flex gap-3 text-sm font-medium text-neutral-400">
          <Link className="rounded-lg border border-neutral-800 px-3 py-2 transition hover:border-white hover:text-white" to="/">
            Workspace
          </Link>
          <Link className="rounded-lg border border-neutral-800 px-3 py-2 transition hover:border-white hover:text-white" to="/status">
            Status
          </Link>
        </nav>

        <Routes>
          <Route
            path="/"
            element={
              <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <PrivateNotes />
                <Guestbook />
              </div>
            }
          />
          <Route path="/status" element={<StatusPanel />} />
          <Route
            path="*"
            element={
              <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-8">
                <h2 className="text-2xl font-semibold">Not found</h2>
                <Link className="mt-4 inline-flex text-neutral-300 hover:text-white" to="/">
                  Back to workspace
                </Link>
              </section>
            }
          />
        </Routes>
      </div>
    </main>
  );
}

export function App() {
  return (
    <Router>
      <HomePage />
    </Router>
  );
}
