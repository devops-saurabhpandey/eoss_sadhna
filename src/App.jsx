import React, { useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const modules = [
  { key: "dashboard", icon: "⌂", label: "Dashboard" },
  { key: "tasks", icon: "✓", label: "Tasks" },
  { key: "reports", icon: "▤", label: "Reports" },
  { key: "team", icon: "◉", label: "Team" },
  { key: "settings", icon: "⚙", label: "Settings" }
];

const initialTasks = [
  { id: 1, title: "Review pending RTO reports", owner: "Operations", status: "In Progress", priority: "High" },
  { id: 2, title: "Prepare branch MIS summary", owner: "MIS", status: "Pending", priority: "Medium" },
  { id: 3, title: "Verify monthly transactions", owner: "Accounts", status: "Completed", priority: "Low" }
];

function StatCard({ label, value, note }) {
  return <div className="stat-card"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

export default function App() {
  const [auth, setAuth] = useState(() => {
    try { return JSON.parse(localStorage.getItem("eoss_auth")) || null; } catch { return null; }
  });

  if (!auth) return <Login onLogin={setAuth} />;

  return <Workspace auth={auth} onLogout={() => { localStorage.removeItem("eoss_auth"); setAuth(null); }} />;
}

function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch(API_BASE + "/api/auth/" + mode, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Request failed");
      if (mode === "register") {
        setMode("login");
        setMessage("Registration successful. Now login.");
      } else {
        localStorage.setItem("eoss_auth", JSON.stringify(data));
        onLogin(data);
      }
    } catch (error) {
      setMessage(error.message + " (API: " + API_BASE + ")");
    } finally {
      setLoading(false);
    }
  };

  return <div className="login-page">
    <div className="login-card">
      <div className="brand login-brand"><div className="brand-mark">S</div><div><b>SHIVASHA</b><small>EOSS Sadhna</small></div></div>
      <p className="eyebrow">ENTERPRISE OPERATIONS & SUPPORT SYSTEM</p>
      <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
      <p className="muted">{mode === "login" ? "Sign in to continue to EOSS Sadhna." : "Register a user for the EOSS Sadhna workspace."}</p>
      <form onSubmit={submit}>
        {mode === "register" && <label>Name<input required value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="Your name" /></label>}
        <label>Email<input required type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} placeholder="name@example.com" /></label>
        <label>Password<input required minLength="6" type="password" value={form.password} onChange={e => setForm({...form,password:e.target.value})} placeholder="Minimum 6 characters" /></label>
        <button className="primary login-button" disabled={loading}>{loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}</button>
      </form>
      {message && <div className="login-message">{message}</div>}
      <button className="switch-auth" onClick={() => { setMode(mode === "login" ? "register" : "login"); setMessage(""); }}>
        {mode === "login" ? "Create a new account" : "Already have an account? Login"}
      </button>
    </div>
  </div>;
}

function Workspace({ auth, onLogout }) {
  const [active, setActive] = useState("dashboard");
  const [tasks, setTasks] = useState(initialTasks);
  const [query, setQuery] = useState("");

  const filteredTasks = useMemo(
    () => tasks.filter(t => (t.title + t.owner + t.status).toLowerCase().includes(query.toLowerCase())),
    [tasks, query]
  );

  const addTask = () => {
    const title = window.prompt("New task name");
    if (!title?.trim()) return;
    setTasks(prev => [{ id: Date.now(), title: title.trim(), owner: "Operations", status: "Pending", priority: "Medium" }, ...prev]);
    setActive("tasks");
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">S</div><div><b>SHIVASHA</b><small>EOSS Sadhna</small></div></div>
      <nav>{modules.map(m => <button key={m.key} className={active === m.key ? "nav-item active" : "nav-item"} onClick={() => setActive(m.key)}><span>{m.icon}</span>{m.label}</button>)}</nav>
      <div className="sidebar-footer">Enterprise Operations<br />& Support System</div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div><span className="eyebrow">SHIVASHA EOSS™</span><h1>{modules.find(m => m.key === active)?.label}</h1><small className="welcome-user">Signed in as {auth.user?.name} · {auth.user?.role}</small></div>
        <div className="top-actions"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." /><button className="primary" onClick={addTask}>+ New Task</button><button className="logout" onClick={onLogout}>Logout</button></div>
      </header>
      {active === "dashboard" && <Dashboard tasks={tasks} setActive={setActive} />}
      {active === "tasks" && <Tasks tasks={filteredTasks} />}
      {active === "reports" && <Reports tasks={tasks} />}
      {active === "team" && <Team />}
      {active === "settings" && <Settings />}
    </main>
  </div>;
}

function Dashboard({ tasks, setActive }) {
  const completed = tasks.filter(t => t.status === "Completed").length;
  return <section className="content"><div className="hero"><div><p className="eyebrow">ENTERPRISE OPERATIONS</p><h2>Good work starts with clear operations.</h2><p>Track tasks, teams and business reports from one simple workspace.</p></div><button className="secondary" onClick={() => setActive("reports")}>View Reports →</button></div><div className="stats"><StatCard label="Open Tasks" value={tasks.length - completed} note="Across operations" /><StatCard label="Completed" value={completed} note="This workspace" /><StatCard label="Team Members" value="12" note="Active users" /><StatCard label="Reports" value="8" note="Ready to review" /></div><div className="grid-two"><div className="panel"><div className="panel-head"><h3>Recent Tasks</h3><button onClick={() => setActive("tasks")}>View all</button></div>{tasks.slice(0,4).map(t => <TaskRow key={t.id} task={t} />)}</div><div className="panel"><div className="panel-head"><h3>Quick Actions</h3></div><div className="quick-grid"><button onClick={() => setActive("tasks")}>✓<span>Manage Tasks</span></button><button onClick={() => setActive("reports")}>▤<span>Open Reports</span></button><button onClick={() => setActive("team")}>◉<span>Team</span></button><button onClick={() => setActive("settings")}>⚙<span>Settings</span></button></div></div></div></section>;
}

function TaskRow({ task }) { return <div className="task-row"><div><b>{task.title}</b><small>{task.owner} · {task.priority} priority</small></div><span className={"status " + task.status.toLowerCase().replaceAll(" ","-")}>{task.status}</span></div>; }
function Tasks({ tasks }) { return <section className="content"><div className="panel"><div className="panel-head"><h3>Task Management</h3><span>{tasks.length} items</span></div>{tasks.length ? tasks.map(t => <TaskRow key={t.id} task={t} />) : <div className="empty">No matching tasks.</div>}</div></section>; }
function Reports({ tasks }) { return <section className="content"><div className="stats"><StatCard label="Operational Tasks" value={tasks.length} note="Current dataset" /><StatCard label="High Priority" value={tasks.filter(t=>t.priority==="High").length} note="Needs attention" /><StatCard label="Completion Rate" value={Math.round(tasks.filter(t=>t.status==="Completed").length / Math.max(tasks.length,1) * 100) + "%"} note="Task completion" /></div><div className="panel"><div className="panel-head"><h3>Management Report</h3><button className="secondary">Export</button></div><p className="muted">The workspace is now authentication-ready. Task data is still demo data until the next API module is connected.</p></div></section>; }
function Team() { return <section className="content"><div className="panel"><div className="panel-head"><h3>Team Directory</h3><span>12 active</span></div>{["Operations","MIS & Reporting","Accounts","IT Support"].map((x,i)=><div className="team-row" key={x}><div className="avatar">{x[0]}</div><div><b>{x}</b><small>{[4,3,2,3][i]} members</small></div><span>Active</span></div>)}</div></section>; }
function Settings() { return <section className="content"><div className="panel settings"><h3>Workspace Settings</h3><label>Organization name<input defaultValue="Shivasha" /></label><label>Product name<input defaultValue="EOSS Sadhna" /></label><label>Environment<select defaultValue="Development"><option>Development</option><option>Production</option></select></label><button className="primary">Save Settings</button></div></section>; }
