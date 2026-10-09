import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function AdminDashboard({ auth }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(API_BASE + "/api/users/admin/reports", {
      headers: { Authorization: "Bearer " + auth?.token }
    }).then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to load reports");
      if (!cancelled) setReports(data.reports || []);
    }).catch(err => {
      if (!cancelled) setError(err.message);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [auth?.token]);

  return <section className="content">
    <div className="feed-head"><div><h2>Admin Moderation</h2><p>Review user reports submitted to SHIVASHA.</p></div><b>{reports.filter(r => r.status === "open").length} open</b></div>
    {error && <div className="api-error">{error}</div>}
    {loading ? <div className="panel empty">Loading reports…</div> :
      reports.length ? <div className="panel">
        {reports.map(report => <article className="notification-item" key={report._id}>
          <div className="notification-copy">
            <b>{report.target?.name || "Unknown account"}</b>
            <small>Reported by {report.reporter?.name || "Unknown"} · {report.reason}</small>
            <small>Status: {report.status} · {new Date(report.createdAt).toLocaleString()}</small>
          </div>
        </article>)}
      </div> : <div className="panel empty">No reports to review.</div>}
  </section>;
}
