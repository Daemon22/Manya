import { useMemo, useState } from "react";
import {
  Activity,
  Bell,
  CircleDollarSign,
  DatabaseZap,
  Gauge,
  KeyRound,
  LockKeyhole,
  type LucideIcon,
  Route,
  ShieldCheck,
  WalletCards
} from "lucide-react";
import { StatusPill } from "./components/StatusPill";
import { auditEvents, providers, usageSeries } from "./lib/mock-data";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export default function App() {
  const [selectedProvider, setSelectedProvider] = useState("groq");
  const activeProviders = providers.filter((provider) => provider.phase === "active");
  const totals = useMemo(() => {
    return providers.reduce(
      (acc, provider) => {
        acc.requests += provider.requests;
        acc.cost += provider.cost;
        return acc;
      },
      { requests: 0, cost: 0 }
    );
  }, []);
  const maxRequests = Math.max(...usageSeries.map((item) => item.requests));

  return (
    <main className="min-h-screen">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-signal">Manya tool registry</p>
            <h1 className="mt-1 text-3xl font-semibold text-ink md:text-4xl">uSINGA - API NEXUS</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Universal API wallet, monitoring, credit visibility, analytics, and routing for OpenAI, Groq, Hugging Face,
              and the provider ecosystem coming next.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-panel px-3 text-sm font-medium text-ink shadow-sm">
              <ShieldCheck size={17} />
              Audit Ready
            </button>
            <button className="inline-flex h-10 items-center gap-2 rounded-md bg-signal px-3 text-sm font-semibold text-[#161412] shadow-sm">
              <DatabaseZap size={17} />
              API: {apiBase.replace("http://", "")}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit border-r border-line bg-transparent pr-4">
          <nav className="grid gap-1 text-sm">
            {[
              ["Dashboard", Gauge],
              ["API Wallet", WalletCards],
              ["Provider Health", Activity],
              ["Smart Routing", Route],
              ["Credits", CircleDollarSign],
              ["Alerts", Bell],
              ["Security", LockKeyhole]
            ].map(([label, Icon]) => (
              <button
                key={label as string}
                className="flex h-10 items-center gap-2 rounded-md px-3 text-left font-medium text-muted hover:bg-panel hover:shadow-sm"
              >
                <Icon size={17} />
                {label as string}
              </button>
            ))}
          </nav>
        </aside>

        <section className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-4">
            <Metric icon={WalletCards} label="Active providers" value={activeProviders.length.toString()} detail="OpenAI, Groq, Hugging Face" />
            <Metric icon={KeyRound} label="Vault posture" value="Encrypted" detail="Keys never return in plain text" />
            <Metric icon={Activity} label="Tracked calls" value={totals.requests.toLocaleString()} detail="Manual and routed usage" />
            <Metric icon={CircleDollarSign} label="Estimated spend" value={`$${totals.cost.toFixed(2)}`} detail="Budget-based credit visibility" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
            <section className="rounded-lg border border-line bg-panel p-5 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Provider command center</h2>
                  <p className="text-sm text-muted">Health, cost, latency, and feature coverage in one scan.</p>
                </div>
                <select
                  value={selectedProvider}
                  onChange={(event) => setSelectedProvider(event.target.value)}
                  className="h-10 rounded-md border border-line bg-surface px-3 text-sm text-ink"
                >
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5 overflow-hidden rounded-md border border-line">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-surface text-xs uppercase text-muted">
                    <tr>
                      <th className="px-4 py-3">Provider</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Requests</th>
                      <th className="px-4 py-3">Cost</th>
                      <th className="px-4 py-3">Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providers.map((provider) => (
                      <tr key={provider.id} className="border-t border-line">
                        <td className="px-4 py-3 font-medium">{provider.name}</td>
                        <td className="px-4 py-3"><StatusPill status={provider.status} /></td>
                        <td className="px-4 py-3">{provider.requests.toLocaleString()}</td>
                        <td className="px-4 py-3">${provider.cost.toFixed(2)}</td>
                        <td className="px-4 py-3">{provider.latency ? `${provider.latency} ms` : "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-lg border border-line bg-panel p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Smart routing test</h2>
              <p className="mt-1 text-sm text-muted">The backend scores provider health, key availability, cost, latency, and budget.</p>
              <div className="mt-5 grid gap-3">
                <FormRow label="Task" value="low-latency chat" />
                <FormRow label="Model" value="mixtral-8x7b" />
                <FormRow label="Budget cap" value="$0.20" />
                <div className="rounded-md border border-signal/20 bg-signal/10 p-4 text-sm text-signal">
                  Selected route: <strong>{providers.find((provider) => provider.id === selectedProvider)?.name}</strong>
                  <br />
                  Reason: active key, lowest latency profile, and configured budget available.
                </div>
              </div>
            </section>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
            <section className="rounded-lg border border-line bg-panel p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Usage and cost trend</h2>
              <div className="mt-5 flex h-64 items-end gap-3 border-b border-line pb-2">
                {usageSeries.map((item) => (
                  <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-md bg-signal"
                      style={{ height: `${Math.max((item.requests / maxRequests) * 210, 18)}px` }}
                      title={`${item.requests} requests, $${item.cost}`}
                    />
                    <span className="text-xs font-medium text-muted">{item.day}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-line bg-panel p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Security and audit</h2>
              <div className="mt-4 grid gap-3">
                {auditEvents.map((event) => (
                  <div key={event} className="flex items-start gap-3 rounded-md border border-line bg-surface p-3 text-sm">
                    <ShieldCheck className="mt-0.5 text-signal" size={17} />
                    <span>{event}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-lg border border-line bg-panel p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Roadmap truth</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {["Marketplace", "Team collaboration", "Local model orchestration", "OMNIMIND integration"].map((item) => (
                <div key={item} className="rounded-md border border-line bg-surface p-4">
                  <p className="font-medium">{item}</p>
                  <p className="mt-1 text-sm text-muted">Planned after the wallet, monitoring, analytics, and routing foundation.</p>
                </div>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string; detail: string }) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">{label}</span>
        <Icon size={18} className="text-signal" />
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </section>
  );
}

function FormRow({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-muted">{label}</span>
      <input className="h-10 rounded-md border border-line bg-surface px-3 text-ink" readOnly value={value} />
    </label>
  );
}
