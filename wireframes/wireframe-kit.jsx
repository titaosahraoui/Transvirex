// wireframe-kit.jsx — reusable low-fi sketchy components

const Phone = ({ children, time = "9:41", batt = "84%", carrier = "•••• 5G" }) => (
  <div className="phone">
    <div className="status">
      <span>{time}</span>
      <span style={{opacity:0}}>•</span>
      <span>{carrier} · {batt}</span>
    </div>
    <div className="screen">{children}</div>
  </div>
);

const Variation = ({ label, badge, note, children }) => (
  <div className="var">
    <div className="lbl">
      <span>{label}</span>
      {badge && <span className="badge">{badge}</span>}
    </div>
    {note && <div className="note">{note}</div>}
    <div style={{position:"relative"}}>{children}</div>
  </div>
);

const VarRow = ({ children }) => <div className="varrow">{children}</div>;

const Section = ({ n, title, desc }) => (
  <div className="sec">
    <h2><span className="n">{n}</span>{title}</h2>
    <span className="desc">{desc}</span>
  </div>
);

const Win = ({ url = "app.transvirex.fr", wide, mid, children }) => (
  <div className={"win" + (wide ? " wide" : "") + (mid ? " mid" : "")}>
    <div className="chrome">
      <div className="dots"><i/><i/><i/></div>
      <div className="url">{url}</div>
      <span className="mono" style={{opacity:.5}}>⌘</span>
    </div>
    <div className="body">{children}</div>
  </div>
);

const Side = ({ active = "", logo = "transvirex", role = "Dispatcher", items = [] }) => (
  <aside className="side">
    <div className="logo">{logo}<span style={{color:"var(--accent)"}}>.</span></div>
    <div className="mono" style={{fontSize:10, color:"var(--ink-3)", marginTop:2}}>{role}</div>
    {items.map((it, i) => (
      typeof it === "string"
        ? <div key={i} className="group">{it}</div>
        : <div key={i} className={"nav" + (it.key === active ? " on" : "")}>
            <span className="ic">{it.icon}</span><span>{it.label}</span>
            {it.tag && <span className="pill" style={{marginLeft:"auto", fontSize:10}}>{it.tag}</span>}
          </div>
    ))}
    <div style={{marginTop:"auto"}}>
      <div className="row" style={{padding:"6px 8px", borderStyle:"solid"}}>
        <div className="lead" style={{width:28,height:28,fontSize:14}}>M</div>
        <div className="main"><b>Marc D.</b><small>{role}</small></div>
      </div>
    </div>
  </aside>
);

const AppBar = ({ crumbs = "", search = "Rechercher…", actions, me = "MD" }) => (
  <div className="appbar">
    <span className="crumbs">{crumbs}</span>
    <div className="search">🔍 {search}</div>
    {actions}
    <div className="me">
      <span className="pill">🔔 3</span>
      <div className="av">{me}</div>
    </div>
  </div>
);

const Box = ({ as = "div", className = "", title, sub, children, style }) => {
  const Tag = as;
  return (
    <Tag className={"box " + className} style={style}>
      {title && <h>{title}</h>}
      {sub && <small>{sub}</small>}
      {children}
    </Tag>
  );
};

const Row = ({ lead, title, sub, end, children, style }) => (
  <div className="row" style={style}>
    {lead != null && <div className="lead">{lead}</div>}
    <div className="main">
      {title && <b>{title}</b>}
      {sub && <small>{sub}</small>}
      {children}
    </div>
    {end != null && <div className="end">{end}</div>}
  </div>
);

const Pill = ({ kind = "", children }) => (
  <span className={"pill " + kind}>{children}</span>
);

const ImgPh = ({ w = 120, h = 80, label = "img", style }) => (
  <div className="imgph" style={{ width: w, height: h, ...style }}>
    <span>{label}</span>
  </div>
);

const Anno = ({ x, y, w = 180, dir = "left", children, rot = -3 }) => {
  const arrowSize = 36;
  return (
    <div className="anno" style={{ left:x, top:y, width:w, transform:`rotate(${rot}deg)` }}>
      {dir === "left" && (
        <svg width={arrowSize} height={28} viewBox="0 0 40 28">
          <path d="M2 14 C 10 22, 22 22, 36 14 M36 14 L 28 10 M36 14 L 30 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      )}
      <span>{children}</span>
      {dir === "right" && (
        <svg width={arrowSize} height={28} viewBox="0 0 40 28">
          <path d="M38 14 C 30 22, 18 22, 4 14 M4 14 L 12 10 M4 14 L 10 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      )}
    </div>
  );
};

const Stamp = ({ x, y, rot = -8, children }) => (
  <div className="stamp" style={{ left:x, top:y, transform:`rotate(${rot}deg)` }}>{children}</div>
);

// Map with route + pins
const MapView = ({ h = 240, pins = [], route = true, style }) => (
  <div className="map" style={{ height: h, ...style }}>
    <svg viewBox="0 0 400 240" preserveAspectRatio="none">
      {/* roads */}
      <path d="M-10 60 Q 80 80 160 50 T 410 90" stroke="rgba(31,29,26,.18)" strokeWidth="6" fill="none"/>
      <path d="M-10 60 Q 80 80 160 50 T 410 90" stroke="#fff" strokeWidth="3" fill="none" strokeDasharray="2 6"/>
      <path d="M40 -10 Q 60 120 120 140 T 240 250" stroke="rgba(31,29,26,.18)" strokeWidth="6" fill="none"/>
      <path d="M40 -10 Q 60 120 120 140 T 240 250" stroke="#fff" strokeWidth="3" fill="none" strokeDasharray="2 6"/>
      <path d="M-10 180 Q 120 170 240 200 T 410 180" stroke="rgba(31,29,26,.18)" strokeWidth="6" fill="none"/>
      <path d="M-10 180 Q 120 170 240 200 T 410 180" stroke="#fff" strokeWidth="3" fill="none" strokeDasharray="2 6"/>
      {/* river */}
      <path d="M-10 110 Q 80 130 160 120 T 410 140" stroke="#cfe0ef" strokeWidth="10" fill="none" opacity=".7"/>
      {/* blocks */}
      <rect x="80" y="20" width="36" height="24" fill="rgba(31,29,26,.04)" stroke="rgba(31,29,26,.18)"/>
      <rect x="200" y="30" width="46" height="20" fill="rgba(31,29,26,.04)" stroke="rgba(31,29,26,.18)"/>
      <rect x="260" y="150" width="36" height="36" fill="rgba(31,29,26,.04)" stroke="rgba(31,29,26,.18)"/>
      <rect x="60" y="160" width="40" height="22" fill="rgba(31,29,26,.04)" stroke="rgba(31,29,26,.18)"/>
      {/* route */}
      {route && (
        <path d="M70 200 Q 140 140 200 130 T 340 60" stroke="var(--accent)" strokeWidth="2.5" strokeDasharray="6 5" fill="none"/>
      )}
    </svg>
    {pins.map((p, i) => (
      <div key={i} className={"pin " + (p.kind || "")} style={{ left: p.x + "%", top: p.y + "%" }}>
        {p.icon || ""} {p.label}
      </div>
    ))}
  </div>
);

// bar chart
const BarChart = ({ data = [], height = 130, color = "var(--ink)" }) => {
  const max = Math.max(...data.map(d => d.v), 1);
  return (
    <div className="canvas" style={{ height, display:"flex", alignItems:"flex-end", gap:6, paddingTop:6, borderBottom:"1.4px solid var(--ink)" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <div style={{
            width:"80%", height: (d.v / max * (height - 30)) + "px",
            background: d.color || color,
            border:"1.3px solid var(--ink)", borderRadius:"4px 4px 0 0",
          }}/>
          <span className="mono" style={{ fontSize:10, color:"var(--ink-3)" }}>{d.l}</span>
        </div>
      ))}
    </div>
  );
};

// sparkline / line chart
const LineChart = ({ points = "", height = 130, accent = "var(--accent)" }) => (
  <div className="canvas" style={{ height, position:"relative", borderBottom:"1.4px solid var(--ink)" }}>
    <svg viewBox="0 0 300 120" preserveAspectRatio="none" style={{ width:"100%", height:"100%" }}>
      {/* gridlines */}
      <line x1="0" y1="30" x2="300" y2="30" stroke="rgba(31,29,26,.12)" strokeDasharray="3 4"/>
      <line x1="0" y1="60" x2="300" y2="60" stroke="rgba(31,29,26,.12)" strokeDasharray="3 4"/>
      <line x1="0" y1="90" x2="300" y2="90" stroke="rgba(31,29,26,.12)" strokeDasharray="3 4"/>
      <path d={points} stroke={accent} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      <path d={points} stroke="rgba(31,29,26,.85)" strokeWidth="0.8" strokeDasharray="2 3" fill="none"/>
    </svg>
  </div>
);

// donut/kpi
const KPI = ({ label, value, delta, kind = "" }) => (
  <div className="box solid" style={{ minWidth: 140 }}>
    <small className="mono" style={{ textTransform:"uppercase", letterSpacing:".06em" }}>{label}</small>
    <div className="script" style={{ fontSize: 34, lineHeight: 1, marginTop: 2 }}>{value}</div>
    {delta && <span className={"pill " + kind} style={{ marginTop:6 }}>{delta}</span>}
  </div>
);

// heatmap cells
const Heatmap = ({ rows = 6, cols = 12, data, height = 140 }) => {
  const cells = data || Array.from({ length: rows * cols }, () => Math.random());
  return (
    <div className="canvas" style={{ display:"grid", gridTemplateColumns:`repeat(${cols}, 1fr)`, gridTemplateRows:`repeat(${rows}, 1fr)`, gap:3, height }}>
      {cells.map((v, i) => (
        <div key={i} style={{
          background: `rgba(31,29,26,${0.05 + v * 0.75})`,
          border:"1px solid rgba(31,29,26,.25)", borderRadius:3,
        }}/>
      ))}
    </div>
  );
};

// signature pad placeholder
const Signature = ({ h = 110 }) => (
  <div className="box" style={{ height:h, padding:0, position:"relative", background:"#fffdf6" }}>
    <svg viewBox="0 0 300 110" preserveAspectRatio="none" style={{ width:"100%", height:"100%" }}>
      <path d="M20 70 q 20 -30 40 -10 t 40 -10 q 20 30 50 0 t 60 20 q 20 -40 50 -15"
            stroke="var(--ink)" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".85"/>
    </svg>
    <span className="mono" style={{ position:"absolute", left:8, bottom:4, fontSize:10, color:"var(--ink-3)" }}>Signature client</span>
  </div>
);

// tab bar for mobile
const TabBar = ({ items = [], active = 0 }) => (
  <div className="flex jc-sb ai-c" style={{
    borderTop:"1.5px dashed var(--ink)", paddingTop:8, marginTop:6,
  }}>
    {items.map((it, i) => (
      <div key={i} style={{ textAlign:"center", flex:1, opacity: i === active ? 1 : .5 }}>
        <div style={{ fontSize:18 }}>{it.icon}</div>
        <div className="mono" style={{ fontSize:9.5, marginTop:2 }}>{it.label}</div>
      </div>
    ))}
  </div>
);

Object.assign(window, {
  Phone, Variation, VarRow, Section,
  Win, Side, AppBar,
  Box, Row, Pill, ImgPh, Anno, Stamp,
  MapView, BarChart, LineChart, KPI, Heatmap, Signature, TabBar,
});
