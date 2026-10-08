import React, { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function apiFetch(path, auth, options = {}) {
  return fetch(API_BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(auth?.token ? { Authorization: "Bearer " + auth.token } : {}),
      ...(options.headers || {})
    }
  }).then(async response => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "API request failed");
    return data;
  });
}

export default function App() {
  const [auth, setAuth] = useState(() => {
    try { return JSON.parse(localStorage.getItem("shivasha_auth")) || null; } catch { return null; }
  });
  if (!auth) return <Login onLogin={setAuth} />;
  return <SocialApp auth={auth} setAuth={setAuth} onLogout={() => { localStorage.removeItem("shivasha_auth"); setAuth(null); }} />;
}

function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault(); setMessage(""); setLoading(true);
    try {
      const data = await apiFetch("/api/auth/" + mode, null, { method: "POST", body: JSON.stringify(form) });
      if (mode === "register") {
        setMode("login"); setMessage("Account created. Now login.");
      } else {
        localStorage.setItem("shivasha_auth", JSON.stringify(data)); onLogin(data);
      }
    } catch (error) { setMessage(error.message); } finally { setLoading(false); }
  };

  return <div className="login-page">
    <div className="login-card">
      <div className="shivasha-logo">S</div>
      <div className="login-brand"><b>SHIVASHA</b><small>Social • Connect • Share</small></div>
      <p className="eyebrow">SOCIAL COMMUNITY PLATFORM</p>
      <h1>{mode === "login" ? "Welcome to SHIVASHA" : "Join SHIVASHA"}</h1>
      <p className="muted">{mode === "login" ? "Connect with people and share what matters." : "Create your profile and start connecting."}</p>
      <form onSubmit={submit}>
        {mode === "register" && <label>Name<input required value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="Your name" /></label>}
        <label>Email<input required type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} placeholder="name@example.com" /></label>
        <label>Password<input required minLength="6" type="password" value={form.password} onChange={e => setForm({...form,password:e.target.value})} placeholder="Minimum 6 characters" /></label>
        <button className="primary login-button" disabled={loading}>{loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}</button>
      </form>
      {message && <div className="login-message">{message}</div>}
      <button className="switch-auth" onClick={() => { setMode(mode === "login" ? "register" : "login"); setMessage(""); }}>
        {mode === "login" ? "Create a new account" : "Already have an account? Login"}
      </button>
    </div>
  </div>;
}

function Avatar({ user, large = false }) {
  const letter = (user?.name || "S").trim().charAt(0).toUpperCase();
  return user?.avatarUrl ? <img className={large ? "avatar large" : "avatar"} src={user.avatarUrl} alt="" /> : <div className={large ? "avatar large" : "avatar"}>{letter}</div>;
}

function SocialApp({ auth, setAuth, onLogout }) {
  const [active, setActive] = useState("home");
  const [posts, setPosts] = useState([]);
  const [me, setMe] = useState(auth.user);
  const [discover, setDiscover] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true); setMessage("");
    try {
      const [postData, meData, users] = await Promise.all([
        apiFetch("/api/posts", auth),
        apiFetch("/api/users/me", auth),
        apiFetch("/api/users/discover", auth)
      ]);
      setPosts(postData); setMe(meData.user); setDiscover(users);
      const nextAuth = {...auth, user: meData.user};
      setAuth(nextAuth); localStorage.setItem("shivasha_auth", JSON.stringify(nextAuth));
    } catch (e) { setMessage(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const visibleUsers = useMemo(() => discover.filter(u => (u.name + " " + (u.bio || "")).toLowerCase().includes(query.toLowerCase())), [discover, query]);

  const updatePost = post => setPosts(prev => prev.map(p => p._id === post._id ? post : p));

  const createPost = async (text, imageUrl) => {
    try {
      const post = await apiFetch("/api/posts", auth, { method: "POST", body: JSON.stringify({text, imageUrl}) });
      setPosts(prev => [post, ...prev]); setActive("home");
    } catch (e) { setMessage(e.message); }
  };

  const like = async id => { try { updatePost(await apiFetch("/api/posts/" + id + "/like", auth, {method:"POST"})); } catch(e){setMessage(e.message);} };
  const comment = async (id, text) => { try { updatePost(await apiFetch("/api/posts/" + id + "/comments", auth, {method:"POST",body:JSON.stringify({text})})); } catch(e){setMessage(e.message);} };
  const follow = async id => {
    try {
      await apiFetch("/api/users/" + id + "/follow", auth, {method:"POST"});
      const users = await apiFetch("/api/users/discover", auth); setDiscover(users);
      const mine = await apiFetch("/api/users/me", auth); setMe(mine.user);
    } catch(e){setMessage(e.message);}
  };

  return <div className="social-shell">
    <header className="mobile-header"><b>SHIVASHA</b><button onClick={onLogout}>Logout</button></header>
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">S</div><div><b>SHIVASHA</b><small>Social • Connect • Share</small></div></div>
      <nav>
        {[["home","⌂","Home"],["discover","◎","Discover"],["create","＋","Create Post"],["profile","◉","Profile"]].map(([key,icon,label]) =>
          <button key={key} className={active===key?"nav-item active":"nav-item"} onClick={()=>setActive(key)}><span>{icon}</span>{label}</button>
        )}
      </nav>
      <div className="sidebar-user"><Avatar user={me}/><div><b>{me?.name}</b><small>@{(me?.email || "").split("@")[0]}</small></div></div>
      <button className="logout" onClick={onLogout}>Logout</button>
    </aside>
    <main className="main">
      <header className="topbar">
        <div><span className="eyebrow">SHIVASHA</span><h1>{active==="home"?"Home":active==="discover"?"Discover":active==="create"?"Create Post":"My Profile"}</h1></div>
        <div className="top-actions"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search people..." /><Avatar user={me}/></div>
      </header>
      {message && <div className="api-error">{message}</div>}
      {active==="home" && <section className="content"><div className="feed-head"><div><h2>Your Feed</h2><p>Latest posts from the SHIVASHA community.</p></div><button className="primary" onClick={()=>setActive("create")}>+ Create</button></div>{loading?<div className="empty">Loading feed...</div>:posts.length?posts.map(p=><PostCard key={p._id} post={p} me={me} onLike={like} onComment={comment}/>):<div className="panel empty">No posts yet. Create the first SHIVASHA post.</div>}</section>}
      {active==="create" && <CreatePost onCreate={createPost}/>}
      {active==="discover" && <Discover users={visibleUsers} me={me} onFollow={follow}/>}
      {active==="profile" && <Profile me={me} posts={posts.filter(p=>p.author?._id===me?._id: p.author===me?._id)} auth={auth} onSaved={u=>{setMe(u);setAuth({...auth,user:u});localStorage.setItem("shivasha_auth",JSON.stringify({...auth,user:u}));}}/>}
    </main>
  </div>;
}

function PostCard({post,me,onLike,onComment}) {
  const [text,setText]=useState("");
  const liked=post.likes?.some(id => (id._id||id).toString()===(me?.id||me?._id)?.toString());
  return <article className="post-card">
    <div className="post-author"><Avatar user={post.author}/><div><b>{post.author?.name}</b><small>{new Date(post.createdAt).toLocaleString()}</small></div></div>
    {post.text && <p className="post-text">{post.text}</p>}
    {post.imageUrl && <img className="post-image" src={post.imageUrl} alt="Post" />}
    <div className="post-actions"><button className={liked?"liked":""} onClick={()=>onLike(post._id)}>♥ {post.likes?.length||0}</button><span>💬 {post.comments?.length||0}</span></div>
    <div className="comments">{post.comments?.slice(-3).map(c=><div className="comment" key={c._id}><b>{c.user?.name}</b> {c.text}</div>)}</div>
    <form className="comment-form" onSubmit={e=>{e.preventDefault();if(text.trim()){onComment(post._id,text.trim());setText("");}}}><input value={text} onChange={e=>setText(e.target.value)} placeholder="Write a comment..." /><button>Post</button></form>
  </article>;
}

function CreatePost({onCreate}) {
  const [text,setText]=useState(""); const [imageUrl,setImageUrl]=useState("");
  return <section className="content narrow"><div className="panel"><div className="panel-head"><h2>Create a Post</h2></div><textarea className="post-composer" value={text} onChange={e=>setText(e.target.value)} placeholder="What do you want to share?" maxLength="2000"/><label>Image URL (optional)<input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg"/></label><button className="primary" disabled={!text.trim()&&!imageUrl.trim()} onClick={()=>onCreate(text.trim(),imageUrl.trim())}>Publish Post</button></div></section>;
}

function Discover({users,me,onFollow}) {
  return <section className="content"><div className="feed-head"><div><h2>Discover People</h2><p>Find people and grow your SHIVASHA network.</p></div></div><div className="people-grid">{users.map(u=>{const following=u.followers?.some(id=>(id._id||id).toString()===(me?.id||me?._id)?.toString());return <div className="person-card" key={u._id}><Avatar user={u} large/><h3>{u.name}</h3><p>{u.bio||"SHIVASHA member"}</p><small>{u.followers?.length||0} followers</small><button className={following?"secondary":"primary"} onClick={()=>onFollow(u._id)}>{following?"Following":"Follow"}</button></div>})}</div></section>;
}

function Profile({me,posts,auth,onSaved}) {
  const [name,setName]=useState(me?.name||""); const [bio,setBio]=useState(me?.bio||""); const [avatarUrl,setAvatarUrl]=useState(me?.avatarUrl||""); const [saved,setSaved]=useState("");
  const save=async()=>{try{const r=await apiFetch("/api/users/me",auth,{method:"PATCH",body:JSON.stringify({name,bio,avatarUrl})});onSaved(r.user);setSaved("Profile saved");}catch(e){setSaved(e.message);}};
  return <section className="content narrow"><div className="profile-hero"><Avatar user={{...me,avatarUrl,name}} large/><div><h2>{name}</h2><p>{bio||"Welcome to SHIVASHA."}</p><div className="profile-stats"><b>{me?.followers?.length||0}<small>Followers</small></b><b>{me?.following?.length||0}<small>Following</small></b><b>{posts.length}<small>Posts</small></b></div></div></div><div className="panel"><h3>Edit Profile</h3><label>Name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Bio<textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength="280"/></label><label>Avatar URL<input value={avatarUrl} onChange={e=>setAvatarUrl(e.target.value)} placeholder="https://example.com/avatar.jpg"/></label><button className="primary" onClick={save}>Save Profile</button>{saved&&<span className="save-message">{saved}</span>}</div></section>;
}
