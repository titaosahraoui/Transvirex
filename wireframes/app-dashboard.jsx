// app-dashboard.jsx — Web dashboard / KPIs

const dashNav = [
  "ANALYTICS",
  { key:"ov",  icon:"📊", label:"Vue d'ensemble" },
  { key:"drv", icon:"🚐", label:"Chauffeurs" },
  { key:"sla", icon:"⏱", label:"Ponctualité" },
  { key:"cost",icon:"💶", label:"Coûts & marge" },
  { key:"geo", icon:"🗺", label:"Zones / heatmap" },
  "RAPPORTS",
  { key:"rep", icon:"📄", label:"Rapports", tag:"4" },
  { key:"exp", icon:"⤓",  label:"Exports" },
];

// === 1A — Vue d'ensemble (cockpit)
const DashOverview_A = () => (
  <Win wide url="dashboard.transvirex.fr">
    <Side active="ov" logo="transvirex" role="Direction · Aujourd'hui" items={dashNav}/>
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <AppBar crumbs="Vue d'ensemble · aujourd'hui"
        actions={<div className="flex gap-6"><Pill>‹</Pill><Pill kind="warn">Auj.</Pill><Pill>Sem.</Pill><Pill>Mois</Pill><Pill>Trim.</Pill></div>}/>
      <div style={{ padding:16, flex:1 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
          <KPI label="LIVRAISONS" value="184" delta="+12% vs hier" kind="good"/>
          <KPI label="EN COURS" value="11" delta="cap. 78%" kind="warn"/>
          <KPI label="PONCTUALITÉ" value="92%" delta="-3 pts" kind="warn"/>
          <KPI label="INCIDENTS" value="3" delta="2 ouverts" kind="bad"/>
          <KPI label="C.A. JOUR" value="2 348€" delta="+€280"/>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:14, marginTop:14 }}>
          <div className="chart">
            <h><span>Livraisons par heure</span><small>auj. vs moy. 7j</small></h>
            <LineChart points="M0 90 L20 80 L40 65 L60 50 L80 30 L100 40 L120 25 L140 35 L160 50 L180 35 L200 25 L220 18 L240 30 L260 42 L280 55 L300 70"/>
            <div className="flex jc-sb mono fs-10 muted">
              <span>08h</span><span>10h</span><span>12h</span><span>14h</span><span>16h</span><span>18h</span>
            </div>
          </div>
          <div className="chart">
            <h><span>Mix par type</span><small>part du C.A.</small></h>
            <div className="canvas flex gap-12 ai-c jc-c" style={{ paddingTop:8 }}>
              <svg viewBox="0 0 100 100" width="120" height="120">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(31,29,26,.15)" strokeWidth="14"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--ink)" strokeWidth="14" strokeDasharray="160 251" transform="rotate(-90 50 50)"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--accent)" strokeWidth="14" strokeDasharray="50 251" strokeDashoffset="-160" transform="rotate(-90 50 50)"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--good)" strokeWidth="14" strokeDasharray="30 251" strokeDashoffset="-210" transform="rotate(-90 50 50)"/>
                <text x="50" y="48" textAnchor="middle" fontSize="16" fontFamily="Caveat" fontWeight="700" fill="var(--ink)">184</text>
                <text x="50" y="60" textAnchor="middle" fontSize="7" fontFamily="ui-monospace" fill="var(--ink-3)">livraisons</text>
              </svg>
              <div>
                <div className="flex ai-c gap-6 fs-12"><span style={{ width:10,height:10, background:"var(--ink)" }}/> Express ·  <b>64%</b></div>
                <div className="flex ai-c gap-6 fs-12 mt-4"><span style={{ width:10,height:10, background:"var(--accent)" }}/> VIP · <b>20%</b></div>
                <div className="flex ai-c gap-6 fs-12 mt-4"><span style={{ width:10,height:10, background:"var(--good)" }}/> Standard · <b>12%</b></div>
                <div className="flex ai-c gap-6 fs-12 mt-4"><span style={{ width:10,height:10, background:"rgba(31,29,26,.15)" }}/> Autres · <b>4%</b></div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginTop:14 }}>
          <div className="chart">
            <h><span>Top chauffeurs (auj.)</span></h>
            <Row style={{ borderStyle:"solid" }} lead="K" title="K. Benali" sub="42 courses · 98% à l'heure" end={<Pill kind="good">▲</Pill>}/>
            <Row lead="S" title="S. Moreau" sub="38 courses · 91% · 1 incident" end={<Pill kind="warn">●</Pill>}/>
            <Row lead="R" title="R. Petit" sub="35 courses · 96%" end={<Pill kind="good">▲</Pill>}/>
            <Row lead="L" title="L. Tran" sub="33 courses · 99%" end={<Pill kind="good">▲</Pill>}/>
          </div>
          <div className="chart">
            <h><span>Hubs · charge</span><small>vs cap.</small></h>
            <BarChart height={140} data={[
              { l:"Est", v:78, color:"var(--accent)" },
              { l:"Sud", v:54 }, { l:"Nord", v:62 },
              { l:"Ouest", v:38 }, { l:"Lyon", v:71 },
              { l:"Lille", v:30 },
            ]}/>
          </div>
          <div className="chart">
            <h><span>Alertes du jour</span><small>3 ouvertes</small></h>
            <Row style={{ borderStyle:"solid" }} lead="🔥" title="#0046 accident léger" sub="Sofiane M. · il y a 4 min" end={<Pill kind="bad">!</Pill>}/>
            <Row lead="⏱" title="#0048 retard +18 min" sub="VIP · Maison Dior" end={<Pill kind="warn">…</Pill>}/>
            <Row lead="⚠" title="Hub Est · surcharge" sub="24 / cap. 18 entre 12-14h" end={<Pill kind="warn">…</Pill>}/>
          </div>
        </div>
      </div>
    </div>
    <Anno x={400} y={70} w={170} dir="right" rot={-3}>cockpit en 5 KPIs<br/>+ détails dessous</Anno>
  </Win>
);

// === 1B — Vue d'ensemble (editorial / storytelling)
const DashOverview_B = () => (
  <Win wide url="dashboard.transvirex.fr">
    <Side active="ov" logo="transvirex" role="Direction · ce mois" items={dashNav}/>
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <AppBar crumbs="Vue d'ensemble · mai 2026"/>
      <div style={{ padding:24, flex:1 }}>
        <small className="mono">VOTRE MOIS EN 1 PHRASE</small>
        <div className="script" style={{ fontSize:46, lineHeight:1.05, maxWidth:780 }}>
          <span className="u">3 412 colis livrés</span>, <span className="u">+18%</span> vs avril, mais la ponctualité a baissé de <span className="u">3 points</span> à cause du hub Est.
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:14, marginTop:18 }}>
          <Box className="solid">
            <small className="mono">CE QUI MARCHE</small>
            <div className="script fs-22" style={{ lineHeight:1.05 }}>L'app chauffeur</div>
            <div className="mono fs-11 muted mt-4">98% des POD signés sur mobile · +14 pts</div>
            <Pill kind="good" style={{ marginTop:6 }}>▲ tendance</Pill>
          </Box>
          <Box className="solid">
            <small className="mono">CE QUI INQUIÈTE</small>
            <div className="script fs-22" style={{ lineHeight:1.05 }}>Hub Est saturé</div>
            <div className="mono fs-11 muted mt-4">capacité dépassée 7 jours sur 22</div>
            <Pill kind="warn" style={{ marginTop:6 }}>● à surveiller</Pill>
          </Box>
          <Box className="solid">
            <small className="mono">À CORRIGER</small>
            <div className="script fs-22" style={{ lineHeight:1.05 }}>Retards VIP</div>
            <div className="mono fs-11 muted mt-4">12 retards > 15 min, dont 4 Dior</div>
            <Pill kind="bad" style={{ marginTop:6 }}>▼ baisse</Pill>
          </Box>
          <Box className="solid">
            <small className="mono">À CÉLÉBRER</small>
            <div className="script fs-22" style={{ lineHeight:1.05 }}>Karim, 1000e course</div>
            <div className="mono fs-11 muted mt-4">98% à l'heure · sur 12 mois</div>
            <Pill kind="good" style={{ marginTop:6 }}>🏆</Pill>
          </Box>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14, marginTop:18 }}>
          <div className="chart">
            <h><span>Volume mensuel · 12 mois glissants</span><small>colis livrés</small></h>
            <LineChart height={150} points="M0 100 L30 92 L60 85 L90 88 L120 72 L150 78 L180 65 L210 60 L240 50 L270 55 L300 35"/>
            <div className="flex jc-sb mono fs-10 muted"><span>juin</span><span>août</span><span>oct</span><span>déc</span><span>fév</span><span>avr</span><span>mai</span></div>
          </div>
          <Box className="solid">
            <small className="mono">RAPPORTS PRÊTS</small>
            <Row style={{ borderStyle:"solid" }} lead="📄" title="Synthèse mai 2026" sub="généré ce matin · PDF · 14 p." end="⤓"/>
            <Row lead="📄" title="Activité Hub Est" sub="hebdo S20 · CSV" end="⤓"/>
            <Row lead="📄" title="Ponctualité VIP" sub="mensuel · PDF · 6 p." end="⤓"/>
          </Box>
        </div>
      </div>
    </div>
    <Anno x={130} y={170} w={180} dir="right" rot={2}>raconte le mois<br/>en 1 phrase = lisible</Anno>
  </Win>
);

// === 2A — Performance par chauffeur (tableau leaderboard)
const DashDrivers_A = () => (
  <Win wide url="dashboard.transvirex.fr / chauffeurs">
    <Side active="drv" logo="transvirex" role="Direction" items={dashNav}/>
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <AppBar crumbs="Analytics / Performance chauffeurs · mai"
        actions={<div className="flex gap-6"><Pill>Hub : tous</Pill><Pill>Véhicule : tous</Pill><Pill kind="warn">⤓ Export</Pill></div>}/>
      <div style={{ padding:16, flex:1 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
          <KPI label="ACTIFS" value="42 / 48"/>
          <KPI label="COURSES" value="3 412" delta="+18%" kind="good"/>
          <KPI label="MOY. / JOUR" value="34" delta="+3"/>
          <KPI label="NOTE MOY." value="4,7" delta="+0,1"/>
        </div>

        <Box className="solid mt-12" title="Classement mai" sub="trié par score (ponctualité × volume × satisfaction)">
          <table className="tbl mt-8">
            <thead><tr>
              <th>#</th><th>Chauffeur</th><th>Hub</th><th>Véh.</th>
              <th>Courses</th><th>Ponct.</th><th>Note</th><th>Incidents</th><th>Score</th>
            </tr></thead>
            <tbody>
              <tr><td>1</td><td><b>K. Benali</b></td><td>Paris-Est</td><td>🛵</td><td>184</td><td><Pill kind="good">98%</Pill></td><td>4,9</td><td>0</td><td><b className="script fs-18">96</b></td></tr>
              <tr><td>2</td><td><b>L. Tran</b></td><td>Paris-Sud</td><td>🚲</td><td>148</td><td><Pill kind="good">99%</Pill></td><td>4,9</td><td>1</td><td><b className="script fs-18">94</b></td></tr>
              <tr><td>3</td><td>R. Petit</td><td>Paris-Est</td><td>🚲</td><td>156</td><td><Pill kind="good">96%</Pill></td><td>4,8</td><td>1</td><td><b className="script fs-18">91</b></td></tr>
              <tr><td>4</td><td>S. Moreau</td><td>Paris-Est</td><td>🚐</td><td>172</td><td><Pill kind="warn">91%</Pill></td><td>4,5</td><td>3</td><td><b className="script fs-18">82</b></td></tr>
              <tr><td>5</td><td>A. Diallo</td><td>Paris-Nord</td><td>🚐</td><td>140</td><td><Pill kind="warn">89%</Pill></td><td>4,6</td><td>2</td><td><b className="script fs-18">79</b></td></tr>
              <tr><td>6</td><td>M. Costa</td><td>Lyon</td><td>🛵</td><td>122</td><td><Pill kind="good">95%</Pill></td><td>4,7</td><td>1</td><td><b className="script fs-18">88</b></td></tr>
              <tr><td>7</td><td>N. Berger</td><td>Lille</td><td>🚐</td><td>98</td><td><Pill kind="warn">88%</Pill></td><td>4,4</td><td>4</td><td><b className="script fs-18">71</b></td></tr>
            </tbody>
          </table>
        </Box>
      </div>
    </div>
  </Win>
);

// === 2B — Performance chauffeur (profil individuel)
const DashDrivers_B = () => (
  <Win wide url="dashboard.transvirex.fr / chauffeurs / k-benali">
    <Side active="drv" logo="transvirex" role="Direction" items={dashNav}/>
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <AppBar crumbs="Chauffeurs / Karim Benali"
        actions={<div className="flex gap-6"><Pill>‹ précédent</Pill><Pill>suivant ›</Pill></div>}/>
      <div style={{ padding:16, flex:1, display:"grid", gridTemplateColumns:"240px 1fr", gap:14 }}>
        <Box className="solid">
          <div style={{ width:"100%", aspectRatio:"1", border:"1.4px solid var(--ink)", borderRadius:99,
            display:"flex", alignItems:"center", justifyContent:"center",
            background:"#fff5d6", fontFamily:"var(--font-script)", fontWeight:700, fontSize:48 }}>K</div>
          <div className="script fs-22 mt-8" style={{ lineHeight:1.05 }}>Karim Benali</div>
          <small className="mono">Hub Paris-Est · 🛵 TVX-019</small>
          <div className="mt-8 flex gap-4">
            <Pill kind="good">🏆 #1 mai</Pill>
            <Pill>32 ans</Pill>
          </div>
          <hr className="hr-wave"/>
          <small className="mono">CONTACT</small>
          <div className="fs-12">📞 +33 6 12 ••• ••</div>
          <div className="fs-12">✉ karim.b@tvx.fr</div>
          <hr className="hr-wave"/>
          <small className="mono">ANCIENNETÉ</small>
          <div className="fs-13">2 ans 4 mois</div>
        </Box>
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
            <KPI label="COURSES MAI" value="184" delta="▲ #1"/>
            <KPI label="PONCT." value="98%" delta="+2 pts" kind="good"/>
            <KPI label="NOTE" value="4,9" delta="357 avis"/>
            <KPI label="INCIDENTS" value="0" delta="—" kind="good"/>
          </div>
          <div className="chart mt-12">
            <h><span>Courses par jour · mai</span></h>
            <BarChart height={130} data={Array.from({length:22}, (_,i)=>({ l:String(i+1).padStart(2,"0"), v: 4 + Math.round(Math.random()*9 + (i%7===5?-3:0)), color: i===21 ? "var(--accent)" : "var(--ink)"}))}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:14, marginTop:12 }}>
            <div className="chart">
              <h><span>Heures actives</span><small>par tranche</small></h>
              <BarChart height={120} data={[
                { l:"07-09", v:62 }, { l:"09-11", v:74 }, { l:"11-13", v:88, color:"var(--accent)" },
                { l:"13-15", v:48 }, { l:"15-17", v:70 }, { l:"17-19", v:34 },
              ]}/>
            </div>
            <Box className="solid">
              <small className="mono">DERNIERS RETOURS CLIENT</small>
              <div className="mt-4 fs-12" style={{ background:"#fff5d6", padding:6, borderRadius:6 }}>“Super rapide, très poli.” — Mme L., 5★</div>
              <div className="mt-4 fs-12" style={{ background:"#fff5d6", padding:6, borderRadius:6 }}>“Trouvé l'adresse sans appel.” — J. M., 5★</div>
              <div className="mt-4 fs-12" style={{ background:"#fffdf6", padding:6, borderRadius:6, border:"1.2px dashed var(--ink)" }}>“Un peu en avance, pratique.” — Pharma, 4★</div>
            </Box>
          </div>
        </div>
      </div>
    </div>
    <Anno x={530} y={130} w={170} dir="left" rot={-3}>fiche perso<br/>= levier RH</Anno>
  </Win>
);

// === 3A — Ponctualité & coûts (split)
const DashSLA_A = () => (
  <Win wide url="dashboard.transvirex.fr / ponctualite-couts">
    <Side active="sla" logo="transvirex" role="Direction" items={dashNav}/>
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <AppBar crumbs="Qualité de service · mai 2026"/>
      <div style={{ padding:16, flex:1 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
          <KPI label="LIVRAISONS À L'HEURE" value="92%" delta="-3 pts vs avr." kind="warn"/>
          <KPI label="DÉLAI MOY." value="38 min" delta="objectif 35"/>
          <KPI label="COÛT / COURSE" value="6,82€" delta="-0,12€" kind="good"/>
          <KPI label="MARGE BRUTE" value="42%" delta="+1,4 pts" kind="good"/>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginTop:14 }}>
          <div className="chart">
            <h><span>Ponctualité · 30 jours</span><small>seuil SLA 95%</small></h>
            <LineChart height={170} points="M0 30 L20 25 L40 30 L60 22 L80 28 L100 38 L120 32 L140 45 L160 38 L180 50 L200 42 L220 35 L240 42 L260 38 L280 48 L300 42"/>
          </div>
          <div className="chart">
            <h><span>Décomposition du coût</span><small>€ / course</small></h>
            <div className="canvas" style={{ paddingTop:8 }}>
              {[
                ["Carburant / énergie", 28, "var(--ink)"],
                ["Salaire chauffeur", 41, "var(--accent)"],
                ["Véhicule (amort.)", 14, "var(--good)"],
                ["Plateforme / IT", 9, "rgba(31,29,26,.55)"],
                ["Autres", 8, "rgba(31,29,26,.25)"],
              ].map(([l,v,c],i)=>(
                <div key={i} className="flex ai-c gap-8" style={{ marginTop: i ? 8 : 0 }}>
                  <div style={{ width: 100, fontSize:12 }}>{l}</div>
                  <div style={{ flex:1, height:14, border:"1.3px solid var(--ink)", borderRadius:4, background:"#fffdf6", position:"relative" }}>
                    <div style={{ position:"absolute", inset:0, width: v+"%", background:c, borderRight:"1.2px solid var(--ink)" }}/>
                  </div>
                  <div className="mono fs-11" style={{ width:36, textAlign:"right" }}>{v}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Box className="solid mt-12" title="Ponctualité par hub" sub="mai 2026 · SLA 95%">
          <table className="tbl mt-4">
            <thead><tr><th>Hub</th><th>Volume</th><th>À l'heure</th><th>Retard moy.</th><th>SLA</th><th>Coût / course</th></tr></thead>
            <tbody>
              <tr><td>Paris-Est</td><td>1 248</td><td><Pill kind="warn">87%</Pill></td><td className="mono">+9 min</td><td><Pill kind="bad">✗</Pill></td><td>6,42€</td></tr>
              <tr><td>Paris-Sud</td><td>740</td><td><Pill kind="good">96%</Pill></td><td className="mono">+3 min</td><td><Pill kind="good">✓</Pill></td><td>7,10€</td></tr>
              <tr><td>Paris-Nord</td><td>520</td><td><Pill kind="good">95%</Pill></td><td className="mono">+4 min</td><td><Pill kind="good">✓</Pill></td><td>6,98€</td></tr>
              <tr><td>Lyon</td><td>418</td><td><Pill kind="good">94%</Pill></td><td className="mono">+5 min</td><td><Pill kind="warn">●</Pill></td><td>6,72€</td></tr>
              <tr><td>Lille</td><td>286</td><td><Pill kind="warn">88%</Pill></td><td className="mono">+8 min</td><td><Pill kind="bad">✗</Pill></td><td>7,18€</td></tr>
            </tbody>
          </table>
        </Box>
      </div>
    </div>
    <Anno x={310} y={70} w={170} dir="right" rot={-3}>SLA + coût<br/>côte à côte</Anno>
  </Win>
);

// === 3B — Ponctualité (focus retards)
const DashSLA_B = () => (
  <Win wide url="dashboard.transvirex.fr / ponctualite ?focus=retards">
    <Side active="sla" logo="transvirex" role="Direction" items={dashNav}/>
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <AppBar crumbs="Ponctualité · analyse des retards"
        actions={<div className="flex gap-6"><Pill kind="warn">Mai</Pill><Pill>≥ 5 min</Pill><Pill>VIP only</Pill></div>}/>
      <div style={{ padding:18, flex:1 }}>
        <div className="script" style={{ fontSize:42, lineHeight:1 }}>
          <span className="u">258 retards</span> ce mois, dont <span className="u">42 supérieurs à 15 min</span>.
        </div>
        <small className="mono">8% des courses ont dépassé l'engagement client.</small>

        <div style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr", gap:14, marginTop:16 }}>
          <div className="chart">
            <h><span>Distribution des retards</span><small>en min, après l'ETA</small></h>
            <BarChart height={170} data={[
              { l:"≤2", v:62 }, { l:"2-5", v:90 }, { l:"5-10", v:64 },
              { l:"10-15", v:28, color:"var(--accent)" },
              { l:"15-30", v:38, color:"var(--accent)" },
              { l:"30+", v:4, color:"var(--bad)" },
            ]}/>
          </div>
          <div>
            <Box className="solid" title="Top causes" sub="agrégation auto">
              <Row style={{ borderStyle:"solid" }} lead="🚧" title="Trafic / embouteillage" sub="44% des retards" end="—"/>
              <Row lead="📍" title="Adresse incomplète" sub="22%" end="—"/>
              <Row lead="📦" title="Colis non prêt à l'enlèvement" sub="14%" end="—"/>
              <Row lead="🅿" title="Stationnement impossible" sub="11%" end="—"/>
              <Row lead="✕" title="Autre / non renseigné" sub="9%" end="—"/>
            </Box>
            <Box className="mt-8" title="Recommandation" sub="généré auto · à valider">
              <div className="fs-13">Décaler la fenêtre de pickup du Hub Est de 15 min ; gain attendu <span className="u">~+2,5 pts</span> de SLA.</div>
              <div className="flex gap-6 mt-8"><Pill>Ignorer</Pill><Pill kind="warn">Tester 2 semaines</Pill></div>
            </Box>
          </div>
        </div>
      </div>
    </div>
    <Anno x={130} y={130} w={170} dir="right" rot={2}>insight = phrase,<br/>pas que des chiffres</Anno>
  </Win>
);

// === 4A — Heatmap zones (carte de chaleur)
const DashGeo_A = () => {
  // build pseudo-random data with concentration around center
  const rows = 10, cols = 18;
  const data = Array.from({ length: rows * cols }, (_, i) => {
    const x = (i % cols) / cols, y = Math.floor(i / cols) / rows;
    const cx = .55, cy = .45;
    const d = Math.hypot(x - cx, y - cy);
    return Math.max(0, 1 - d * 2.2 + (Math.random() * 0.25 - 0.12));
  });
  return (
    <Win wide url="dashboard.transvirex.fr / zones">
      <Side active="geo" logo="transvirex" role="Direction" items={dashNav}/>
      <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
        <AppBar crumbs="Zones / heatmap"
          actions={<div className="flex gap-6"><Pill kind="warn">Volume</Pill><Pill>Retards</Pill><Pill>Refus</Pill></div>}/>
        <div style={{ padding:16, flex:1 }}>
          <div className="flex jc-sb ai-c">
            <div>
              <small className="mono">VOLUME DE COURSES · MAI</small>
              <div className="script" style={{ fontSize:36, lineHeight:1 }}>Paris · 3 028 livraisons</div>
            </div>
            <div className="flex gap-6">
              <Pill>1j</Pill><Pill kind="warn">30j</Pill><Pill>90j</Pill><Pill>12m</Pill>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14, marginTop:14 }}>
            <Box className="solid" style={{ padding:10 }}>
              <Heatmap rows={rows} cols={cols} data={data} height={300}/>
              <div className="flex jc-sb mt-8 mono fs-10 muted">
                <span>moins</span>
                <div style={{ flex:1, margin:"0 14px", height:8, background:"linear-gradient(90deg, rgba(31,29,26,.05), rgba(31,29,26,.8))", border:"1px solid var(--ink)", borderRadius:4 }}/>
                <span>plus</span>
              </div>
            </Box>
            <div>
              <Box className="solid" title="Zones chaudes" sub="par densité de livraisons">
                <Row style={{ borderStyle:"solid" }} lead="🔥" title="Marais — 75003/75004" sub="412 livraisons · +8% vs avr." end="13,6%"/>
                <Row lead="🔥" title="Bastille — 75011" sub="358 · stable" end="11,8%"/>
                <Row lead="●"  title="Belleville — 75020" sub="284 · +14%" end="9,4%"/>
                <Row lead="●"  title="Saint-Germain — 75006" sub="262 · -3%" end="8,7%"/>
              </Box>
              <Box className="mt-8" title="Zones froides" sub="opportunités">
                <Row style={{ borderStyle:"solid" }} lead="❄" title="20e périphérie" sub="34 livraisons · -22%" end="1,1%"/>
                <Row lead="❄" title="Boucle Boulogne" sub="52 · stable" end="1,7%"/>
              </Box>
            </div>
          </div>
        </div>
      </div>
    </Win>
  );
};

// === 4B — Heatmap croisée avec time-of-day
const DashGeo_B = () => (
  <Win wide url="dashboard.transvirex.fr / zones ?vue=temps">
    <Side active="geo" logo="transvirex" role="Direction" items={dashNav}/>
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <AppBar crumbs="Zones / quand & où"
        actions={<div className="flex gap-6"><Pill kind="warn">Volume</Pill><Pill>Coût</Pill></div>}/>
      <div style={{ padding:16, flex:1 }}>
        <div className="script" style={{ fontSize:32, lineHeight:1 }}>Quand livrons-nous, et où ?</div>
        <small className="mono">croisement jour de semaine × heure · 30 derniers jours</small>

        <Box className="solid mt-12">
          <div style={{ display:"grid", gridTemplateColumns:"60px repeat(14, 1fr)", gap:3 }}>
            <div/>
            {["07","08","09","10","11","12","13","14","15","16","17","18","19","20"].map(h=>(
              <div key={h} className="mono fs-10 muted tac">{h}</div>
            ))}
            {["LUN","MAR","MER","JEU","VEN","SAM","DIM"].map((d, di)=>(
              <React.Fragment key={d}>
                <div className="mono fs-11 fw-7" style={{ display:"flex", alignItems:"center" }}>{d}</div>
                {Array.from({ length:14 }).map((_,i)=>{
                  // pattern: peak 9-12 weekdays, light evenings, low weekends mornings
                  const base = (i>=2 && i<=6) ? .8 : (i>=7 && i<=10) ? .55 : .25;
                  const we = di >= 5 ? .55 : 1;
                  const v = Math.min(1, base * we + (Math.random()*0.3-0.1));
                  return <div key={i} style={{
                    aspectRatio:"1.5", background:`rgba(31,29,26,${0.06 + v*0.78})`,
                    border:"1px solid rgba(31,29,26,.25)", borderRadius:3
                  }}/>;
                })}
              </React.Fragment>
            ))}
          </div>
        </Box>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginTop:14 }}>
          <Box className="solid">
            <small className="mono">PIC ABSOLU</small>
            <div className="script fs-22">Jeudi · 11h–12h</div>
            <small className="mono muted">+38% vs moyenne</small>
          </Box>
          <Box className="solid">
            <small className="mono">CREUX</small>
            <div className="script fs-22">Dimanche · matin</div>
            <small className="mono muted">-72% — relâche flotte ?</small>
          </Box>
          <Box className="solid">
            <small className="mono">OPPORTUNITÉ</small>
            <div className="script fs-22">Samedi · 17h–19h</div>
            <small className="mono muted">demande non couverte · +12 missions perdues</small>
          </Box>
        </div>
      </div>
    </div>
    <Anno x={120} y={170} w={170} dir="right" rot={3}>jour × heure<br/>= staffing</Anno>
  </Win>
);

window.DashboardApp = function DashboardApp() {
  return (
    <div>
      <div className="tab-intro">
        <h1><span className="hl">Web</span><br/>Dashboard</h1>
        <div>
          <p>KPIs, analytics, rapports. La vue ‘pilotage’ pour la direction et les responsables logistique. Filtres simples, narration claire, exports en 1 clic.</p>
          <span className="meta">apps/web-dashboard · port 3001 · lecture seule</span>
        </div>
      </div>

      <Section n="1" title="Vue d'ensemble · KPIs temps réel" desc="L'écran d'accueil." />
      <VarRow>
        <Variation label="A — Cockpit" badge="dense" note="5 KPIs + courbes + listes. Pour superviser sur grand écran.">
          <DashOverview_A/>
        </Variation>
        <Variation label="B — Editorial" badge="lisible" note="Une phrase, 4 axes (marche / inquiète / corriger / célébrer). Pour la direction.">
          <DashOverview_B/>
        </Variation>
      </VarRow>

      <Section n="2" title="Performance par chauffeur" desc="Qui livre comment." />
      <VarRow>
        <Variation label="A — Leaderboard" badge="comparatif" note="Classement tabulaire avec score composite. Décisions de management.">
          <DashDrivers_A/>
        </Variation>
        <Variation label="B — Profil individuel" badge="fiche" note="Vue ‘360°’ d'un chauffeur. Mise au point, entretien, primes.">
          <DashDrivers_B/>
        </Variation>
      </VarRow>

      <Section n="3" title="Ponctualité & coûts" desc="Qualité de service vs marge." />
      <VarRow>
        <Variation label="A — SLA + coûts en parallèle" badge="comparatif" note="Courbe de SLA + structure de coût + ponctualité par hub.">
          <DashSLA_A/>
        </Variation>
        <Variation label="B — Focus retards" badge="diagnostic" note="Distribution + top causes + recommandation actionable.">
          <DashSLA_B/>
        </Variation>
      </VarRow>

      <Section n="4" title="Zones / cartes de chaleur" desc="Où nos colis se concentrent." />
      <VarRow>
        <Variation label="A — Heatmap géographique" badge="géo" note="Densité spatiale + zones chaudes/froides en liste.">
          <DashGeo_A/>
        </Variation>
        <Variation label="B — Heatmap jour×heure" badge="temporel" note="Quand on livre. Décisions de staffing et créneaux.">
          <DashGeo_B/>
        </Variation>
      </VarRow>
    </div>
  );
};
