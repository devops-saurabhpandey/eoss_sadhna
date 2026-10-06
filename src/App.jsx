import React, { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const modules = [
  { key: "dashboard", icon: "⌂", label: "Dashboard" },
  { key: "tasks", icon: "✓", label: "Tasks" },
  { key: "rto", icon: "▣", label: "RTO Operations" },
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
      <div className="brand login-brand"><div className="brand-mark">S</div><div><b>KTL</b><small>KTL RTO DEPARTMENT</small></div></div>
      <p className="eyebrow">ENTERPRISE OPERATIONS & SUPPORT SYSTEM</p>
      <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
      <p className="muted">{mode === "login" ? "Sign in to continue to KTL RTO DEPARTMENT." : "Register a user for the KTL RTO DEPARTMENT workspace."}</p>
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



function apiFetch(path, auth, options = {}) {
  return fetch(API_BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + auth.token,
      ...(options.headers || {})
    }
  }).then(async response => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "API request failed");
    return data;
  });
}

function Workspace({ auth, onLogout }) {
  const [active, setActive] = useState("dashboard");
  const [tasks, setTasks] = useState([]);
  const [query, setQuery] = useState("");
  const [taskLoading, setTaskLoading] = useState(true);
  const [taskError, setTaskError] = useState("");
  const [team, setTeam] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);

  const loadTasks = async () => {
    setTaskLoading(true);
    setTaskError("");
    try {
      const data = await apiFetch("/api/tasks", auth);
      setTasks(data);
    } catch (error) {
      setTaskError(error.message);
    } finally {
      setTaskLoading(false);
    }
  };

  useEffect(() => { loadTasks(); }, []);

  useEffect(() => {
    if (!["admin", "manager"].includes(auth.user?.role)) return;
    setTeamLoading(true);
    apiFetch("/api/users", auth).then(setTeam).catch(() => {}).finally(() => setTeamLoading(false));
  }, []);

  const filteredTasks = useMemo(
    () => tasks.filter(t => (t.title + t.description + t.status + t.priority).toLowerCase().includes(query.toLowerCase())),
    [tasks, query]
  );

  const addTask = async () => {
    const title = window.prompt("New task name");
    if (!title?.trim()) return;
    const dueDate = window.prompt("Due date (YYYY-MM-DD, optional)", "");
    if (dueDate && !/^\\d{4}-\\d{2}-\\d{2}$/.test(dueDate)) {
      setTaskError("Due date must use YYYY-MM-DD format.");
      return;
    }
    try {
      const task = await apiFetch("/api/tasks", auth, {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), priority: "medium", dueDate: dueDate || null })
      });
      setTasks(prev => [task, ...prev]);
      setActive("tasks");
    } catch (error) {
      setTaskError(error.message);
    }
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">S</div><div><b>KTL</b><small>KTL RTO DEPARTMENT</small></div></div>
      <nav>{modules.map(m => <button key={m.key} className={active === m.key ? "nav-item active" : "nav-item"} onClick={() => setActive(m.key)}><span>{m.icon}</span>{m.label}</button>)}</nav>
      <div className="sidebar-footer">Enterprise Operations<br />& Support System</div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div><span className="eyebrow">KTL RTO DEPARTMENT</span><h1>{modules.find(m => m.key === active)?.label}</h1><small className="welcome-user">Signed in as {auth.user?.name} · {auth.user?.role}</small></div>
        <div className="top-actions"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." /><button className="primary" onClick={addTask}>+ New Task</button><button className="logout" onClick={onLogout}>Logout</button></div>
      </header>
      {taskError && <div className="api-error">{taskError}</div>}
      {active === "dashboard" && <Dashboard tasks={tasks} setActive={setActive} loading={taskLoading} teamCount={teamLoading ? "…" : team.length} />}
      {active === "tasks" && <Tasks tasks={filteredTasks} loading={taskLoading} auth={auth} onChanged={changed => setTasks(prev => changed.__deleted ? prev.filter(t => t._id !== changed._id) : prev.map(t => t._id === changed._id ? changed : t))} />}
      {active === "rto" && <RTOOperations tasks={tasks} auth={auth} />}
      {active === "reports" && <Reports tasks={tasks} />}
      {active === "team" && <Team auth={auth} team={team} setTeam={setTeam} />}
      {active === "settings" && <Settings />}
    </main>
  </div>;
}

function Dashboard({ tasks, setActive, loading, teamCount }) {
  const completed = tasks.filter(t => t.status === "completed").length;
  return <section className="content"><div className="hero"><div><p className="eyebrow">ENTERPRISE OPERATIONS</p><h2>Good work starts with clear operations.</h2><p>Track tasks, teams and business reports from one simple workspace.</p></div><button className="secondary" onClick={() => setActive("reports")}>View Reports →</button></div><div className="stats"><StatCard label="Open Tasks" value={tasks.length - completed} note="Across operations" /><StatCard label="Completed" value={completed} note="This workspace" /><StatCard label="Team Members" value={teamCount} note="Registered users" /><StatCard label="Reports" value="8" note="Ready to review" /></div><div className="grid-two"><div className="panel"><div className="panel-head"><h3>Recent Tasks</h3><button onClick={() => setActive("tasks")}>View all</button></div>{loading ? <div className="empty">Loading tasks...</div> : tasks.slice(0,4).map(t => <TaskRow key={t._id} task={t} />)}</div><div className="panel"><div className="panel-head"><h3>Quick Actions</h3></div><div className="quick-grid"><button onClick={() => setActive("tasks")}>✓<span>Manage Tasks</span></button><button onClick={() => setActive("reports")}>▤<span>Open Reports</span></button><button onClick={() => setActive("team")}>◉<span>Team</span></button><button onClick={() => setActive("settings")}>⚙<span>Settings</span></button></div></div></div></section>;
}

function TaskRow({ task }) {
  const status = task.status === "in-progress" ? "In Progress" : task.status[0].toUpperCase() + task.status.slice(1);
  const priority = task.priority[0].toUpperCase() + task.priority.slice(1);
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const overdue = due && due < new Date() && task.status !== "completed";
  return <div className="task-row"><div><b>{task.title}</b><small>{priority} priority{due ? " · Due " + due.toLocaleDateString() : ""}{overdue ? " · OVERDUE" : ""}</small></div><span className={"status " + task.status}>{status}</span></div>;
}

function Tasks({ tasks, loading, auth, onChanged }) {
  const [team, setTeam] = useState([]);
  const canAssign = ["admin", "manager"].includes(auth.user?.role);

  const editTask = async (task) => {
    const title = window.prompt("Task title", task.title);
    if (!title?.trim()) return;
    const description = window.prompt("Description", task.description || "");
    const dueDate = window.prompt("Due date (YYYY-MM-DD, optional)", task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "");
    if (dueDate && !/^\\d{4}-\\d{2}-\\d{2}$/.test(dueDate)) {
      alert("Due date must use YYYY-MM-DD format.");
      return;
    }
    await updateTask(task._id, { title: title.trim(), description, dueDate: dueDate || null });
  };

  useEffect(() => {
    if (canAssign) apiFetch("/api/users", auth).then(setTeam).catch(() => {});
  }, []);

  const updateTask = async (id, updates) => {
    try {
      const updated = await apiFetch("/api/tasks/" + id, auth, { method: "PATCH", body: JSON.stringify(updates) });
      onChanged(updated);
    } catch (error) {
      console.error(error);
    }
  };

  const deleteTask = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await apiFetch("/api/tasks/" + id, auth, { method: "DELETE" });
      onChanged({ _id: id, __deleted: true });
    } catch (error) {
      console.error(error);
    }
  };

  return <section className="content"><div className="panel"><div className="panel-head"><h3>Task Management</h3><span>{tasks.length} items</span></div>{loading ? <div className="empty">Loading tasks...</div> : tasks.length ? tasks.map(t =>
    <div className="task-row" key={t._id}>
      <div><b>{t.title}</b><small>{t.description || "No description"} · {t.priority} priority</small></div>
      {canAssign && <select value={t.assignedTo || ""} onChange={e => updateTask(t._id, { assignedTo: e.target.value || null })}><option value="">Unassigned</option>{team.map(user => <option key={user._id} value={user._id}>{user.name} · {user.role}</option>)}</select>}
      <select value={t.status} onChange={e => updateTask(t._id, { status: e.target.value })}>
        <option value="pending">Pending</option><option value="in-progress">In Progress</option><option value="completed">Completed</option>
      </select>
      <select value={t.priority} onChange={e => updateTask(t._id, { priority: e.target.value })}>
        <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
      </select>
      <button className="secondary" onClick={() => editTask(t)}>Edit</button><button className="logout" onClick={() => deleteTask(t._id)}>Delete</button>
    </div>
  ) : <div className="empty">No tasks yet. Use + New Task to create one.</div>}</div></section>;
}

function RTOOperations({ tasks, auth }) {
  const [records, setRecords] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ktl_rto_records")) || []; } catch { return []; }
  });
  const [form, setForm] = useState({ vehicleNo: "", branch: "", status: "Pending Registration", transaction: "Pending" });

  const save = (e) => {
    e.preventDefault();
    if (!form.vehicleNo.trim() || !form.branch.trim()) return;
    const next = [{ ...form, id: Date.now(), createdAt: new Date().toISOString() }, ...records];
    setRecords(next);
    localStorage.setItem("ktl_rto_records", JSON.stringify(next));
    setForm({ vehicleNo: "", branch: "", status: "Pending Registration", transaction: "Pending" });
  };

  const pending = records.filter(r => r.status === "Pending Registration").length;
  const completed = records.filter(r => r.status === "Completed").length;
  const transactions = records.filter(r => r.transaction === "Completed").length;

  return <section className="content">
    <div className="hero"><div><p className="eyebrow">KTL RTO OPERATIONS</p><h2>Vehicle Registration & RTO Work Tracking</h2><p>Track branch-wise registration, RC status and transaction progress.</p></div></div>
    <div className="stats">
      <StatCard label="Total Records" value={records.length} note="RTO work records" />
      <StatCard label="Pending Registration" value={pending} note="Needs action" />
      <StatCard label="Completed" value={completed} note="Registration completed" />
      <StatCard label="Transactions Done" value={transactions} note="Transaction status" />
    </div>
    <div className="grid-two">
      <div className="panel"><div className="panel-head"><h3>Add RTO Record</h3><span>{auth.user?.role}</span></div>
        <form onSubmit={save}>
          <label>Vehicle Number<input value={form.vehicleNo} onChange={e=>setForm({...form,vehicleNo:e.target.value.toUpperCase()})} placeholder="UP32 AB 1234" /></label>
          <label>Branch<input value={form.branch} onChange={e=>setForm({...form,branch:e.target.value})} placeholder="Branch name" /></label>
          <label>Registration Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Pending Registration</option><option>In Process</option><option>Completed</option></select></label>
          <label>Transaction Status<select value={form.transaction} onChange={e=>setForm({...form,transaction:e.target.value})}><option>Pending</option><option>Completed</option></select></label>
          <button className="primary">Save RTO Record</button>
        </form>
      </div>
      <div className="panel"><div className="panel-head"><h3>Recent RTO Records</h3><span>{records.length}</span></div>
        {records.length ? records.slice(0,8).map(r=><div className="task-row" key={r.id}><div><b>{r.vehicleNo}</b><small>{r.branch} · {r.status} · Transaction: {r.transaction}</small></div></div>) : <div className="empty">No RTO records yet.</div>}
      </div>
    </div>
  </section>;
}

function Reports({ tasks }) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === "completed").length;
  const inProgress = tasks.filter(t => t.status === "in-progress").length;
  const pending = tasks.filter(t => t.status === "pending").length;
  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed").length;
  const high = tasks.filter(t => t.priority === "high").length;
  const completion = total ? Math.round((completed / total) * 100) : 0;

  return <section className="content"><div className="panel">
    <div className="panel-head"><h3>Operations MIS Report</h3><span>{total} total tasks</span></div>
    <div className="stats">
      <StatCard label="Total Tasks" value={total} note="Current workspace" />
      <StatCard label="Completed" value={completed} note={completion + "% completion"} />
      <StatCard label="In Progress" value={inProgress} note="Active work" />
      <StatCard label="Pending" value={pending} note="Waiting to start" />
    </div>
    <div className="grid-two"><div className="panel"><div className="panel-head"><h3>Risk & Priority</h3></div><p><b>{overdue}</b> overdue tasks</p><p><b>{high}</b> high-priority tasks</p></div>
    <div className="panel"><div className="panel-head"><h3>Completion Rate</h3></div><div style={{fontSize:"34px",fontWeight:800}}>{completion}%</div><small className="muted">Completed / total tasks</small></div></div>
  </div></section>;
}

function Team({ auth, team, setTeam }) {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const canManage = ["admin", "manager"].includes(auth.user?.role);

  useEffect(() => {
    if (!canManage) { setLoading(false); return; }
    apiFetch("/api/users", auth).then(setTeam).catch(error => setMessage(error.message)).finally(() => setLoading(false));
  }, []);

  const changeRole = async (id, role) => {
    try {
      const updated = await apiFetch("/api/users/" + id + "/role", auth, { method: "PATCH", body: JSON.stringify({ role }) });
      setTeam(prev => prev.map(user => user._id === id ? updated : user));
      setMessage("Role updated successfully.");
    } catch (error) { setMessage(error.message); }
  };

  if (!canManage) return <section className="content"><div className="panel"><h3>Team Directory</h3><div className="empty">Only managers and admins can view the team directory.</div></div></section>;
  return <section className="content"><div className="panel"><div className="panel-head"><h3>Team Directory</h3><span>{team.length} users</span></div>{message && <div className="login-message">{message}</div>}{loading ? <div className="empty">Loading team...</div> : team.length ? team.map(user =>
    <div className="team-row" key={user._id}><div className="avatar">{user.name?.charAt(0).toUpperCase()}</div><div><b>{user.name}</b><small>{user.email}</small></div><select value={user.role} onChange={e => changeRole(user._id, e.target.value)} disabled={auth.user?.role !== "admin" || user._id === auth.user?.id}><option value="employee">Employee</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div>
  ) : <div className="empty">No team members found.</div>}</div></section>;
}
function Settings() { return <section className="content"><div className="panel settings"><h3>Workspace Settings</h3><label>Organization name<input defaultValue="Shivasha" /></label><label>Product name<input defaultValue="KTL RTO DEPARTMENT" /></label><label>Environment<select defaultValue="Development"><option>Development</option><option>Production</option></select></label><button className="primary">Save Settings</button></div></section>; }
