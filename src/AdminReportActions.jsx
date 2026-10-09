import React, { useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function AdminReportActions({ report, auth, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const changeStatus = async status => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(API_BASE + "/api/admin/reports/" + report._id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + auth?.token },
        body: JSON.stringify({ status })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not update report");
      onUpdated(data.report);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <div className="profile-actions">
    <button className="secondary" disabled={busy} onClick={() => changeStatus("open")}>Reopen</button>
    <button className="secondary" disabled={busy} onClick={() => changeStatus("reviewed")}>Mark reviewed</button>
    <button className="secondary" disabled={busy} onClick={() => changeStatus("dismissed")}>Dismiss</button>
    {error && <small>{error}</small>}
  </div>;
}
