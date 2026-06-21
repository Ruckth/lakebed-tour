import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Braces,
  Check,
  Cloud,
  Database,
  FileCode2,
  GitBranch,
  Lock,
  Play,
  Terminal,
} from "lucide-react";

const capsuleFiles = [
  {
    name: "server/index.ts",
    detail: "Schema, queries, mutations, and external endpoints in one server contract.",
  },
  {
    name: "client/index.tsx",
    detail: "A Preact entrypoint that subscribes to queries and calls mutations by name.",
  },
  {
    name: "shared/",
    detail: "Pure TypeScript shared between client and server without leaking runtime code.",
  },
  {
    name: ".env.lakebed.server",
    detail: "Server-only values available through ctx.env, never bundled into the client.",
  },
];

const workflow = [
  {
    title: "Create the capsule",
    body: "Start from a tiny full-stack TypeScript app with the pieces agents need already named.",
    icon: Terminal,
  },
  {
    title: "Write the contract",
    body: "Define tables, queries, mutations, and endpoints where the runtime can inspect them.",
    icon: Braces,
  },
  {
    title: "Inspect state",
    body: "Use Lakebed CLI commands to dump tables, read logs, and verify behavior before guessing.",
    icon: Database,
  },
  {
    title: "Deploy the app",
    body: "Ship anonymously first, then claim the deployment when hosted env or owned domains matter.",
    icon: Cloud,
  },
];

const runtimeDetails = [
  "Guest auth works from the first run, with Google sign-in available when the app needs identity.",
  "Server handlers own authorization, data access, env reads, structured logs, and external endpoints.",
  "Hosted inspection is private by default, with public inspect mode available for intentional demos.",
];

const examples = [
  { name: "Todo", href: "https://docs.lakebed.dev/examples/todo" },
  { name: "Guestbook", href: "https://docs.lakebed.dev/examples/guestbook" },
  { name: "Capsule API", href: "https://docs.lakebed.dev/capsule-api" },
];

function CommandLine() {
  return (
    <div className="mx-auto mt-8 flex w-full max-w-xl items-center justify-between gap-4 rounded-lg border border-white/15 bg-black/70 px-4 py-3 text-left shadow-2xl shadow-black/30 backdrop-blur md:mx-0">
      <div className="flex min-w-0 items-center gap-3">
        <Terminal className="h-4 w-4 shrink-0 text-lake" aria-hidden />
        <code className="truncate font-mono text-sm text-white sm:text-base">
          npx lakebed new
        </code>
      </div>
      <span className="shrink-0 rounded-md border border-white/10 px-2 py-1 font-mono text-[11px] uppercase text-white/55">
        Copy
      </span>
    </div>
  );
}

function TerminalVisual() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:44px_44px] opacity-25" />
      <div className="absolute left-1/2 top-24 hidden w-[620px] -translate-x-1/2 rounded-lg border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/40 lg:block">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-lake/80" />
        </div>
        <pre className="font-mono text-xs leading-6 text-white/60">
{`export default capsule({
  schema: {
    messages: table({
      body: string(),
      authorId: string()
    })
  },
  queries: {
    messages: query((ctx) =>
      ctx.db.messages
        .where("authorId", ctx.auth.userId)
        .orderBy("createdAt", "desc")
        .all()
    )
  }
});`}
        </pre>
      </div>
      <div className="absolute bottom-12 left-[8%] hidden rounded-lg border border-white/10 bg-black/60 px-4 py-3 font-mono text-xs text-white/60 shadow-xl shadow-black/30 md:block">
        npx lakebed inspect
      </div>
      <div className="absolute bottom-24 right-[8%] hidden rounded-lg border border-lake/30 bg-lake/10 px-4 py-3 font-mono text-xs text-lake shadow-xl shadow-black/30 md:block">
        deploy ready
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="relative flex min-h-[92svh] items-center overflow-hidden bg-black px-5 pb-24 pt-28 text-white md:min-h-[88vh] md:px-8 md:pt-32">
        <TerminalVisual />
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <div className="max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-lake">
              Agent-native app runtime
            </p>
            <h1 className="mt-5 text-balance text-5xl font-semibold leading-none tracking-normal text-white sm:text-6xl md:text-7xl">
              Lakebed <span className="text-white/42">[alpha]</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/72 md:text-xl">
              Let agents build small full-stack TypeScript apps called capsules, then inspect,
              iterate, and deploy without leaving code.
            </p>
            <CommandLine />
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="https://docs.lakebed.dev/"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/88"
              >
                Read docs
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="#capsule"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/18 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                See the capsule
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="capsule" className="border-y border-border bg-background py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[0.9fr_1.1fr] md:px-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Capsule shape
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal text-foreground md:text-5xl">
              One directory is the whole app.
            </h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground">
              Lakebed keeps the server contract, Preact client, shared types, and server-only
              environment in a shape agents can understand quickly.
            </p>
          </div>
          <div className="grid gap-3">
            {capsuleFiles.map((file) => (
              <div key={file.name} className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <FileCode2 className="h-5 w-5 text-lake" aria-hidden />
                  <h3 className="font-mono text-sm font-semibold text-foreground">
                    {file.name}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {file.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-muted/35 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Agent workflow
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal text-foreground md:text-5xl">
              Build by reading runtime truth.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {workflow.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-lg border border-border bg-card p-5">
                  <Icon className="h-5 w-5 text-lake" aria-hidden />
                  <h3 className="mt-5 text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="runtime" className="py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-2 md:px-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Runtime and data
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal text-foreground md:text-5xl">
              The database is part of the app surface.
            </h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground">
              Tables, auth, env, logs, and endpoints are available through the Lakebed runtime
              contract, so an agent can make changes and verify the result from the CLI.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <Database className="h-5 w-5 text-lake" aria-hidden />
              <span className="font-mono text-sm text-muted-foreground">ctx.db.messages</span>
            </div>
            <ul className="mt-5 space-y-4">
              {runtimeDetails.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-lake" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="deploy" className="border-y border-border bg-black py-20 text-white md:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[1fr_0.9fr] md:px-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-lake">
              Deploy path
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal text-white md:text-5xl">
              Ship a capsule before it becomes a project.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/65">
              Anonymous deploys work first. Claim the deployment when hosted server env, outbound
              fetch, durable ownership, or a Lakebed-owned subdomain matter.
            </p>
          </div>
          <div className="rounded-lg border border-white/12 bg-white/[0.03] p-5">
            <div className="flex items-center gap-3">
              <Play className="h-5 w-5 text-lake" aria-hidden />
              <code className="font-mono text-sm text-white">npx lakebed deploy</code>
            </div>
            <div className="mt-5 grid gap-3 text-sm text-white/62">
              <div className="flex items-center gap-3">
                <Lock className="h-4 w-4 text-white/45" aria-hidden />
                Private hosted inspection by default
              </div>
              <div className="flex items-center gap-3">
                <GitBranch className="h-4 w-4 text-white/45" aria-hidden />
                Commit lakebed.json for owned deploys
              </div>
              <div className="flex items-center gap-3">
                <Boxes className="h-4 w-4 text-white/45" aria-hidden />
                Add a Lakebed app subdomain after claiming
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="examples" className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Examples
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-normal text-foreground md:text-5xl">
                Start from something inspectable.
              </h2>
            </div>
            <Link
              href="https://docs.lakebed.dev/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-foreground transition hover:text-lake"
            >
              Open full docs
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {examples.map((example) => (
              <Link
                key={example.name}
                href={example.href}
                className="rounded-lg border border-border bg-card p-5 transition hover:border-lake/70 hover:shadow-lg hover:shadow-black/5"
              >
                <p className="font-mono text-sm text-muted-foreground">docs.lakebed.dev</p>
                <h3 className="mt-4 text-xl font-semibold text-foreground">{example.name}</h3>
                <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-lake">
                  Read example
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
