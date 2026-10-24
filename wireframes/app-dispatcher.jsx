// app-dispatcher.jsx — Web dispatcher wireframes

const dispatchNav = [
  "OPÉRATIONS",
  { key:"miss", icon:"📋", label:"Missions", tag:"24" },
  { key:"map",  icon:"🗺", label:"Carte temps réel" },
  { key:"plan", icon:"📅", label:"Planning" },
  { key:"alert", icon:"⚠", label:"Alertes", tag:"3" },
  "RÉSEAU",
  { key:"drv",  icon:"🚐", label:"Chauffeurs" },
  { key:"cli",  icon:"🏢", label:"Clients" },
  "OUTILS",
  { key:"chat", icon:"💬", label:"Messages" },
  { key:"set",  icon:"⚙", label:"Réglages" },
];

// === 1A — Tableau dense des missions
const DispatchList_A = () => (
  <Win wide url="dispatcher.transvirex.fr / missions">
    <Side active="miss" logo="transvirex" role="Dispatcher · Hub Paris-Est" items={dispatchNav}/>
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <AppBar crumbs="Opérations / Missions du jour"
        actions={<button className="btn fill">＋ Nouvelle mission</button>}/>
      <div style={{ padding:16, flex:1 }}>
        <div className="flex jc-sb ai-c mb-8">
          <div className="flex gap-6">
            <Pill kind="warn">Toutes · 24</Pill>
            <Pill>À assigner · 6</Pill>
            <Pill>En cours · 11</Pill>
            <Pill kind="good">Livrées · 7</Pill>
            <Pill kind="bad">Incidents · 2</Pill>
          </div>
          <div className="flex gap-6">
            <span className="inp box" style={{ width:200, color:"var(--ink-3)" }}>🔍 ref, client, adresse…</span>
            <Pill>⤓ Export CSV</Pill>
          </div>
        </div>

        <table className="tbl">
          <thead><tr>
            <th>#</th><th>Client</th><th>De → Vers</th><th>Chauffeur</th>
            <th>ETA</th><th>Statut</th><th>Priorité</th><th></th>
          </tr></thead>
          <tbody>
            <tr><td>TVX-0042</td><td>Mme Lefèvre</td><td>Hub-E → 14 Daguerre</td><td>K. Benali</td><td className="mono">11:50</td><td><Pill kind="warn">en route</Pill></td><td><Pill kind="bad">urgente</Pill></td><td>⋯</td></tr>
            <tr><td>TVX-0043</td><td>Bistrot du Coin</td><td>Hub-E → 22 Parmentier</td><td>K. Benali</td><td className="mono">12:10</td><td><Pill>prise</Pill></td><td><Pill>standard</Pill></td><td>⋯</td></tr>
            <tr><td>TVX-0044</td><td>Pharma Centre</td><td>Hub-E → St-Antoine</td><td className="muted">— à assigner —</td><td className="mono">12:40</td><td><Pill>en attente</Pill></td><td><Pill kind="warn">fragile</Pill></td><td>⋯</td></tr>
            <tr><td>TVX-0045</td><td>J. Mercier</td><td>Hub-E → 9 Oberkampf</td><td>S. Moreau</td><td className="mono">12:55</td><td><Pill kind="good">livrée</Pill></td><td><Pill>standard</Pill></td><td>⋯</td></tr>
            <tr><td>TVX-0046</td><td>Atelier 22</td><td>Hub-E → 22 Saint-Maur</td><td>S. Moreau</td><td className="mono">13:30</td><td><Pill kind="warn">retard 12&apos;</Pill></td><td><Pill kind="bad">urgente</Pill></td><td>⋯</td></tr>
            <tr><td>TVX-0047</td><td>Café Lutèce</td><td>Hub-E → 4 Lutèce</td><td className="muted">— à assigner —</td><td className="mono">14:00</td><td><Pill>en attente</Pill></td><td><Pill>standard</Pill></td><td>⋯</td></tr>
            <tr><td>TVX-0048</td><td>Maison Dior</td><td>Hub-E → 30 Montaigne</td><td>R. Petit</td><td className="mono">14:15</td><td><Pill>prise</Pill></td><td><Pill kind="warn">VIP</Pill></td><td>⋯</td></tr>
            <tr><td>TVX-0049</td><td>L. Dubreuil</td><td>Hub-E → 12 Convention</td><td>R. Petit</td><td className="mono">14:45</td><td><Pill>en attente</Pill></td><td><Pill>standard</Pill></td><td>⋯</td></tr>
          </tbody>
        </table>

        <div className="flex jc-sb mt-12">
          <small className="mono muted">8 sur 24 · trié par ETA ↑</small>
          <div className="flex gap-4">
            <Pill>‹</Pill><Pill>1</Pill><Pill kind="warn">2</Pill><Pill>3</Pill><Pill>›</Pill>
          </div>
        </div>
      </div>
    </div>
    <Anno x={620} y={130} w={170} dir="left" rot={-3}>filtres rapides<br/>= la barre clé</Anno>
  </Win>
);

// === 1B — Vue kanban des missions
const DispatchList_B = () => {
  const Card = ({ ref: r, client, addr, eta, drv, kind }) => (
    <Box className="solid" style={{ marginBottom:8 }}>
      <div className="flex jc-sb">
        <span className="mono fs-11">{r}</span>
        {kind && <Pill kind={kind.k}>{kind.l}</Pill>}
      </div>
      <div className="fw-7 fs-13">{client}</div>
      <small className="mono">{addr}</small>
      <div className="flex jc-sb mt-4">
        <span className="mono fs-11">⏱ {eta}</span>
        <span className="mono fs-11">{drv ? "👤 " + drv : "— à assigner —"}</span>
      </div>
    </Box>
  );
  return (
    <Win wide url="dispatcher.transvirex.fr / missions ?view=board">
      <Side active="miss" logo="transvirex" role="Dispatcher · Hub Paris-Est" items={dispatchNav}/>
      <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
        <AppBar crumbs="Opérations / Missions · vue Kanban"
          actions={<div className="flex gap-6"><Pill>≡ Liste</Pill><Pill kind="warn">▤ Board</Pill><Pill>🗺 Carte</Pill></div>}/>
        <div style={{ padding:16, flex:1, display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12 }}>
          <div>
            <div className="flex jc-sb ai-c mb-8"><b>À assigner</b><Pill>6</Pill></div>
            <Card r="TVX-0044" client="Pharma Centre" addr="St-Antoine" eta="12:40" kind={{k:"warn", l:"fragile"}}/>
            <Card r="TVX-0047" client="Café Lutèce" addr="4 Lutèce" eta="14:00"/>
            <Card r="TVX-0049" client="L. Dubreuil" addr="12 Convention" eta="14:45"/>
            <Card r="TVX-0051" client="Le Marais Bio" addr="rue Vieille-du-T." eta="15:10"/>
          </div>
          <div>
            <div className="flex jc-sb ai-c mb-8"><b>Prises</b><Pill>5</Pill></div>
            <Card r="TVX-0043" client="Bistrot du Coin" addr="22 Parmentier" eta="12:10" drv="K. Benali"/>
            <Card r="TVX-0048" client="Maison Dior" addr="30 Montaigne" eta="14:15" drv="R. Petit" kind={{k:"warn", l:"VIP"}}/>
            <Card r="TVX-0052" client="Galerie 75" addr="rue de Rivoli" eta="15:30" drv="S. Moreau"/>
          </div>
          <div>
            <div className="flex jc-sb ai-c mb-8"><b>En route</b><Pill kind="warn">8</Pill></div>
            <Card r="TVX-0042" client="Mme Lefèvre" addr="14 Daguerre" eta="11:50" drv="K. Benali" kind={{k:"bad", l:"urgente"}}/>
            <Card r="TVX-0046" client="Atelier 22" addr="22 Saint-Maur" eta="13:30" drv="S. Moreau" kind={{k:"bad", l:"retard 12'"}}/>
            <Card r="TVX-0050" client="Pâtisserie Lou" addr="4 Cherche-Midi" eta="13:45" drv="R. Petit"/>
          </div>
          <div>
            <div className="flex jc-sb ai-c mb-8"><b>Livrées</b><Pill kind="good">7</Pill></div>
            <Card r="TVX-0045" client="J. Mercier" addr="9 Oberkampf" eta="12:55" drv="S. Moreau" kind={{k:"good", l:"✓"}}/>
            <Card r="TVX-0041" client="Le Petit Marché" addr="Bastille" eta="11:20" drv="K. Benali" kind={{k:"good", l:"✓"}}/>
            <Card r="TVX-0040" client="J. Bocuse" addr="7e" eta="10:42" drv="R. Petit" kind={{k:"good", l:"✓"}}/>
          </div>
        </div>
      </div>
      <Stamp x={510} y={70} rot={-6}>Drag & Drop</Stamp>
    </Win>
  );
};

// === 2A — Création de mission (formulaire à étapes)
const DispatchCreate_A = () => (
  <Win mid url="dispatcher.transvirex.fr / missions / new">
    <Side active="miss" logo="transvirex" role="Dispatcher · Hub Paris-Est" items={dispatchNav}/>
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <AppBar crumbs="Missions / + Nouvelle mission"/>
      <div style={{ padding:18, flex:1 }}>
        <div className="script fs-28">Créer une mission</div>
        <div className="flex gap-4 ai-c mono fs-11 mt-8">
          <span style={{ background:"var(--ink)", color:"#fff", borderRadius:99, padding:"1px 7px" }}>1</span> Expéditeur & destinataire
          <span style={{ flex:1, height:0, borderTop:"1.4px dashed var(--ink)" }}/>
          <span style={{ background:"#fff", border:"1.4px solid var(--ink)", borderRadius:99, padding:"0 7px" }}>2</span> Colis
          <span style={{ flex:1, height:0, borderTop:"1.4px dashed var(--ink)" }}/>
          <span style={{ background:"#fff", border:"1.4px solid var(--ink)", borderRadius:99, padding:"0 7px" }}>3</span> Tarification
          <span style={{ flex:1, height:0, borderTop:"1.4px dashed var(--ink)" }}/>
          <span style={{ background:"#fff", border:"1.4px solid var(--ink)", borderRadius:99, padding:"0 7px" }}>4</span> Récap.
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginTop:14 }}>
          <Box className="solid" title="Expéditeur" sub="Qui envoie ?">
            <div className="inp" style={{ marginTop:6 }}>Hub Paris-Est · 12 av. de la République</div>
            <div className="flex gap-6 mt-8">
              <Pill kind="warn">Hub Paris-Est</Pill><Pill>Hub Paris-Sud</Pill><Pill>+ adresse</Pill>
            </div>
          </Box>
          <Box className="solid" title="Destinataire" sub="Où livrer ?">
            <div className="inp">Mme C. Lefèvre</div>
            <div className="inp" style={{ marginTop:8 }}>14 rue Daguerre, 75014 Paris</div>
            <div className="flex gap-6 mt-8">
              <span className="inp box" style={{ flex:1 }}>📞 Téléphone</span>
              <span className="inp box" style={{ flex:1 }}>🔢 Code / étage</span>
            </div>
          </Box>
        </div>

        <Box className="solid" style={{ marginTop:14 }} title="Créneau" sub="Quand ?">
          <div className="flex gap-6">
            <Pill kind="warn">ASAP</Pill>
            <Pill>≤ 2h</Pill>
            <Pill>Aujourd&apos;hui</Pill>
            <Pill>Demain</Pill>
            <Pill>Plage horaire…</Pill>
          </div>
        </Box>

        <div className="flex jc-sb mt-16">
          <button className="btn">← Annuler</button>
          <div className="flex gap-6">
            <button className="btn">Brouillon</button>
            <button className="btn fill">Étape 2 →</button>
          </div>
        </div>
      </div>
    </div>
    <Anno x={210} y={140} w={170} dir="right" rot={3}>stepper = clair<br/>pour les agents</Anno>
  </Win>
);

// === 2B — Création + assignation (panneau latéral, drag chauffeur)
const DispatchCreate_B = () => (
  <Win wide url="dispatcher.transvirex.fr / missions">
    <Side active="miss" logo="transvirex" role="Dispatcher · Hub Paris-Est" items={dispatchNav}/>
    <div style={{ flex:1, display:"flex", flexDirection:"column", position:"relative" }}>
      <AppBar crumbs="Missions" actions={<Pill kind="warn">＋ Nouveau (raccourci ⌘N)</Pill>}/>
      <div style={{ flex:1, display:"flex" }}>
        {/* faded background list */}
        <div style={{ flex:1, padding:16, opacity:.4, pointerEvents:"none" }}>
          <table className="tbl">
            <thead><tr><th>#</th><th>Client</th><th>De → Vers</th><th>Chauffeur</th><th>ETA</th></tr></thead>
            <tbody>
              {Array.from({length:6}).map((_,i)=>(
                <tr key={i}><td>TVX-00{40+i}</td><td>Client {i+1}</td><td>Hub-E → adr.</td><td>—</td><td className="mono">12:{i}0</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* slide-in panel */}
        <div style={{ width:420, borderLeft:"1.5px dashed var(--ink)", background:"#fffdf6", padding:16, display:"flex", flexDirection:"column", gap:10 }}>
          <div className="flex jc-sb ai-c">
            <span className="script fs-22">Nouvelle mission</span>
            <span className="kbd">esc</span>
          </div>
          <Box className="solid" title="Trajet">
            <div className="flex ai-c gap-6">
              <span className="mono fs-11">DE</span>
              <span className="inp box" style={{ flex:1 }}>Hub Paris-Est</span>
            </div>
            <div className="flex ai-c gap-6 mt-4">
              <span className="mono fs-11">À</span>
              <span className="inp box" style={{ flex:1 }}>14 rue Daguerre, 75014</span>
            </div>
            <small className="mono mt-4 muted">🧭 ≈ 5,4 km · 18 min</small>
          </Box>
          <Box className="solid" title="Colis">
            <div className="flex gap-6">
              <span className="inp box" style={{ flex:1 }}>1 colis</span>
              <span className="inp box" style={{ flex:1 }}>3,2 kg</span>
            </div>
            <div className="flex gap-6 mt-6">
              <Pill kind="warn">fragile</Pill><Pill>standard</Pill><Pill>frais</Pill><Pill>+</Pill>
            </div>
          </Box>
          <Box className="solid" title="Assignation">
            <small className="mono">Suggéré par algo (distance + charge)</small>
            <Row style={{ borderStyle:"solid", marginTop:4 }} lead="K" title="Karim B." sub="2.1 km · 3 courses en cours" end={<Pill kind="good">✓ assigner</Pill>}/>
            <Row lead="S" title="Sofiane M." sub="3.4 km · 1 course" end={<Pill>assigner</Pill>}/>
            <Row lead="R" title="Romain P." sub="6.0 km · pause 12h" end={<Pill>assigner</Pill>}/>
          </Box>
          <div className="flex gap-6" style={{ marginTop:"auto" }}>
            <button className="btn">Brouillon</button>
            <button className="btn fill" style={{ flex:1 }}>Créer & assigner à Karim</button>
          </div>
        </div>
      </div>
      <Stamp x={530} y={70} rot={-5}>Raccourci ⌘N</Stamp>
      <Anno x={500} y={250} w={180} dir="right" rot={-4}>suggestion algo,<br/>1 clic = assigné</Anno>
    </div>
  </Win>
);

// === 3A — Détail mission (split timeline + map)
const DispatchDetail_A = () => (
  <Win wide url="dispatcher.transvirex.fr / missions / TVX-0042">
    <Side active="miss" logo="transvirex" role="Dispatcher · Hub Paris-Est" items={dispatchNav}/>
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <AppBar crumbs="Missions / TVX-0042 — Mme Lefèvre"
        actions={<div className="flex gap-6"><Pill kind="bad">URGENTE</Pill><Pill>⏏ Ré-attribuer</Pill><Pill>✎ Modifier</Pill></div>}/>
      <div style={{ flex:1, display:"grid", gridTemplateColumns:"1.1fr .9fr", gap:0 }}>
        <div style={{ padding:16, borderRight:"1.5px dashed var(--ink)" }}>
          <div className="flex jc-sb ai-end">
            <div>
              <div className="script fs-28" style={{lineHeight:1}}>TVX-2410-0042</div>
              <small className="mono">Créée 11:02 · par L. Robert</small>
            </div>
            <Pill kind="warn">EN ROUTE · ETA 11:50</Pill>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:12 }}>
            <Box className="solid" title="Expéditeur" sub="Hub Paris-Est · 12 av. République"/>
            <Box className="solid" title="Destinataire" sub="Mme Lefèvre · 14 Daguerre · code 4587B"/>
            <Box className="solid" title="Colis" sub="1 · 3,2 kg · fragile"/>
            <Box className="solid" title="Tarif" sub="14,00 € HT · facturé"/>
          </div>

          <div className="mono fs-10 muted mt-12">CHRONOLOGIE</div>
          <div style={{ borderLeft:"2px dashed var(--ink)", paddingLeft:12, marginLeft:6 }}>
            <Row lead="✓" title="Créée" sub="11:02 · L. Robert (dispatch)" end="11:02"/>
            <Row lead="✓" title="Assignée à K. Benali" sub="11:04 · auto-suggestion" end="11:04"/>
            <Row lead="✓" title="Prise en charge" sub="11:18 · scan #TVX-2410-0042" end="11:18"/>
            <Row lead="●" title="En route" sub="départ hub · ETA 11:50" end="11:24"/>
            <Row lead="○" title="Livraison" sub="—" end="—"/>
            <Row lead="○" title="POD validé" sub="—" end="—"/>
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column" }}>
          <MapView h={280} pins={[
            { x:18, y:78, kind:"muted", icon:"⌂", label:"Hub" },
            { x:42, y:60, kind:"driver", icon:"🚐", label:"Karim · 11:32" },
            { x:74, y:32, kind:"acc", icon:"📍", label:"Mme Lefèvre" },
          ]}/>
          <div style={{ padding:14 }}>
            <Box className="solid" title="Chauffeur" sub="K. Benali · véhicule TVX-019 (scooter)">
              <div className="flex jc-sb mt-4">
                <div className="flex gap-6">
                  <Pill kind="good">✓ en ligne</Pill>
                  <Pill>📞 06 12 ••• ••</Pill>
                </div>
                <Pill>💬 Ouvrir chat</Pill>
              </div>
            </Box>
            <Box className="mt-8" title="Communication" sub="3 messages · dernier 11:31">
              <div className="mt-4 mono fs-11 muted">“Embouteillage léger Voltaire, j&apos;arrive”</div>
            </Box>
            <Box className="mt-8" title="Pièces jointes" sub="bon de transport · facture brouillon">
              <div className="flex gap-6 mt-4">
                <Pill>📎 BT.pdf</Pill><Pill>📎 facture.pdf</Pill><Pill>+ ajouter</Pill>
              </div>
            </Box>
          </div>
        </div>
      </div>
    </div>
  </Win>
);

// === 3B — Détail mission (single column, narratif)
const DispatchDetail_B = () => (
  <Win mid url="dispatcher.transvirex.fr / missions / TVX-0042">
    <Side active="miss" logo="transvirex" role="Dispatcher · Hub Paris-Est" items={dispatchNav}/>
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <AppBar crumbs="Missions / TVX-0042"/>
      <div style={{ padding:18, flex:1 }}>
        <div className="flex jc-sb ai-c">
          <div>
            <small className="mono">MISSION</small>
            <div className="script" style={{ fontSize:42, lineHeight:1 }}>TVX-2410-0042</div>
          </div>
          <div className="flex gap-6 ai-c">
            <Pill kind="warn">⚡ URGENTE</Pill>
            <Pill kind="warn">EN ROUTE</Pill>
          </div>
        </div>

        <Box className="solid mt-12">
          <div className="flex ai-c jc-sb">
            <div className="script fs-22">Mme Lefèvre <span className="muted fs-13">·</span> <span className="fs-13 mono muted">+33 6 12 ••• ••</span></div>
            <div className="flex gap-6"><Pill>📞</Pill><Pill>💬</Pill><Pill>✎</Pill></div>
          </div>
          <hr className="hr-wave"/>
          <div className="fs-13">📍 14 rue Daguerre, 75014 Paris — <span className="u">code 4587B, étage 3, bât. C</span></div>
          <div className="flex gap-12 mt-4 mono fs-11 muted">
            <span>⏱ ETA 11:50</span><span>📏 5,4 km</span><span>📦 1 colis · 3,2 kg</span><span>💶 14,00 €</span>
          </div>
        </Box>

        <Box className="mt-8" title="Conversation" sub="3 messages avec Karim">
          <div className="flex gap-6 mt-4">
            <span className="lead" style={{ width:24, height:24, fontSize:13 }}>K</span>
            <small className="mono">11:31 · “Embouteillage léger Voltaire, j&apos;arrive”</small>
          </div>
          <div className="inp box mt-8" style={{ color:"var(--ink-3)" }}>Tapez un message…</div>
        </Box>

        <Box className="mt-8" title="Activité" sub="Tout en un coup d&apos;œil">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr", gap:6, marginTop:6 }}>
            {[
              ["Créée","11:02","✓"],
              ["Assignée","11:04","✓"],
              ["Prise en charge","11:18","✓"],
              ["En route","11:24","●"],
              ["Livraison","—","○"],
              ["POD validé","—","○"],
            ].map(([t,h,m],i)=>(
              <div key={i} style={{ textAlign:"center", border:"1.4px dashed var(--ink)", borderRadius:8, padding:"6px 4px", background: i<4 ? "#fff5d6" : "#fffdf6" }}>
                <div className="script fs-18" style={{ lineHeight:1 }}>{m}</div>
                <div className="fw-7 fs-11">{t}</div>
                <div className="mono fs-10 muted">{h}</div>
              </div>
            ))}
          </div>
        </Box>

        <div className="flex gap-6 mt-12">
          <button className="btn">Ré-attribuer</button>
          <button className="btn">Annuler</button>
          <button className="btn warn" style={{ marginLeft:"auto" }}>Signaler incident</button>
          <button className="btn fill">Voir POD</button>
        </div>
      </div>
    </div>
    <Anno x={210} y={170} w={170} dir="right" rot={-3}>vue ‘fiche’<br/>une seule colonne</Anno>
  </Win>
);

// === 4A — Planning / timeline (par chauffeur)
const DispatchPlanning_A = () => {
  const Block = ({ left, w, label, kind = "", drv }) => (
    <div style={{
      position:"absolute", left, width:w, top:6, height:34,
      border:"1.4px solid var(--ink)", borderRadius:8,
      background: kind === "warn" ? "var(--accent)" : kind === "good" ? "#e3f4dc" : kind === "bad" ? "#ffd9d9" : "#fff5d6",
      color: kind === "warn" ? "#fff" : "var(--ink)",
      padding:"3px 6px", fontSize:11, overflow:"hidden", whiteSpace:"nowrap",
    }}>
      <b>{label}</b>
    </div>
  );
  const Lane = ({ name, vehicle, blocks }) => (
    <div style={{ display:"grid", gridTemplateColumns:"170px 1fr", borderBottom:"1.3px dashed var(--ink)", height:48 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 10px", borderRight:"1.3px dashed var(--ink)", background:"#f6efd9" }}>
        <div className="lead" style={{ width:28, height:28, fontSize:14 }}>{name[0]}</div>
        <div>
          <div className="fw-7 fs-13">{name}</div>
          <small className="mono">{vehicle}</small>
        </div>
      </div>
      <div style={{ position:"relative" }}>{blocks}</div>
    </div>
  );
  return (
    <Win wide url="dispatcher.transvirex.fr / planning">
      <Side active="plan" logo="transvirex" role="Dispatcher · Hub Paris-Est" items={dispatchNav}/>
      <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
        <AppBar crumbs="Planning du 23 mai"
          actions={<div className="flex gap-6"><Pill>‹ jour</Pill><Pill kind="warn">Aujourd&apos;hui</Pill><Pill>jour ›</Pill><Pill>📅 semaine</Pill></div>}/>
        <div style={{ padding:14, flex:1 }}>
          <div style={{ display:"grid", gridTemplateColumns:"170px 1fr" }}>
            <div/>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(10, 1fr)", borderBottom:"1.6px solid var(--ink)", paddingBottom:4 }}>
              {["08","09","10","11","12","13","14","15","16","17"].map(h=>(
                <div key={h} className="mono fs-10 muted" style={{ textAlign:"left", paddingLeft:4 }}>{h}:00</div>
              ))}
            </div>
          </div>

          <Lane name="Karim Benali" vehicle="🛵 TVX-019 · scooter" blocks={<>
            <Block left="3%" w="9%" label="Pré-tournée"/>
            <Block left="13%" w="14%" label="#0042 Lefèvre" kind="warn"/>
            <Block left="28%" w="9%" label="#0043 Bistrot"/>
            <Block left="38%" w="10%" label="#0044 Pharma" kind="warn"/>
            <Block left="50%" w="8%" label="Pause" kind="good"/>
            <Block left="60%" w="13%" label="#0050 Pâtisserie"/>
          </>}/>
          <Lane name="Sofiane Moreau" vehicle="🚐 TVX-007 · utilitaire" blocks={<>
            <Block left="5%" w="13%" label="Tournée Nord"/>
            <Block left="20%" w="14%" label="#0046 Atelier" kind="bad"/>
            <Block left="36%" w="10%" label="#0045 Mercier"/>
            <Block left="48%" w="6%" label="Pause" kind="good"/>
            <Block left="56%" w="22%" label="Tournée Sud"/>
          </>}/>
          <Lane name="Romain Petit" vehicle="🚲 TVX-022 · vélo cargo" blocks={<>
            <Block left="10%" w="8%" label="Prép."/>
            <Block left="20%" w="12%" label="#0048 Dior" kind="warn"/>
            <Block left="34%" w="11%" label="#0049 Dubreuil"/>
            <Block left="46%" w="6%" label="Pause" kind="good"/>
            <Block left="54%" w="20%" label="2e tour"/>
          </>}/>
          <Lane name="Léa Tran" vehicle="🚲 TVX-024 · vélo cargo" blocks={<>
            <Block left="8%" w="20%" label="Tournée matinale"/>
            <Block left="32%" w="12%" label="#0052 Galerie"/>
            <Block left="46%" w="8%" label="Pause" kind="good"/>
            <Block left="56%" w="18%" label="3 livraisons"/>
          </>}/>

          <div className="flex jc-sb mt-12">
            <div className="flex gap-6">
              <Pill kind="warn">■ urgent</Pill>
              <Pill>■ standard</Pill>
              <Pill kind="bad">■ incident</Pill>
              <Pill kind="good">■ pause</Pill>
            </div>
            <small className="mono muted">drag pour réassigner · 5 chauffeurs · charge 78%</small>
          </div>
        </div>
      </div>
      <Anno x={300} y={50} w={180} dir="right" rot={3}>Gantt par chauffeur<br/>= vue ‘ressources’</Anno>
    </Win>
  );
};

// === 4B — Planning carte temps réel
const DispatchPlanning_B = () => (
  <Win wide url="dispatcher.transvirex.fr / temps-reel">
    <Side active="map" logo="transvirex" role="Dispatcher · Hub Paris-Est" items={dispatchNav}/>
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <AppBar crumbs="Carte temps réel"
        actions={<div className="flex gap-6"><Pill kind="warn">● live</Pill><Pill>🔍 filtrer</Pill></div>}/>
      <div style={{ flex:1, display:"flex" }}>
        <div style={{ flex:1, position:"relative" }}>
          <MapView h="100%" pins={[
            { x:22, y:78, kind:"muted", icon:"⌂", label:"Hub" },
            { x:30, y:55, kind:"driver", icon:"🛵", label:"K. Benali · 11:32" },
            { x:46, y:42, kind:"acc", icon:"📍", label:"#0042 ⚡" },
            { x:60, y:30, kind:"driver", icon:"🚐", label:"S. Moreau" },
            { x:75, y:50, kind:"muted", icon:"📦", label:"#0046" },
            { x:55, y:72, kind:"driver", icon:"🚲", label:"R. Petit" },
            { x:36, y:80, kind:"acc", icon:"⚠", label:"#0046 retard" },
            { x:80, y:80, kind:"muted", icon:"📦", label:"#0049" },
          ]} style={{ borderRadius:0, border:0, height:"100%" }}/>
        </div>
        <div style={{ width:300, borderLeft:"1.5px dashed var(--ink)", padding:14, background:"#fffdf6", display:"flex", flexDirection:"column", gap:8 }}>
          <div className="script fs-22">Chauffeurs en ligne</div>
          <Row lead="K" title="Karim B." sub="🛵 #0042 → Daguerre · ETA 11:50" end={<Pill kind="good">●</Pill>}/>
          <Row lead="S" title="Sofiane M." sub="🚐 #0046 · retard 12'" end={<Pill kind="bad">●</Pill>}/>
          <Row lead="R" title="Romain P." sub="🚲 pause · 14e" end={<Pill kind="warn">●</Pill>}/>
          <Row lead="L" title="Léa T." sub="🚲 #0052 → Rivoli" end={<Pill kind="good">●</Pill>}/>
          <hr className="hr-wave"/>
          <small className="mono">FILTRES</small>
          <div className="flex gap-6"><Pill kind="warn">Urgentes</Pill><Pill>En retard</Pill><Pill>VIP</Pill></div>
          <div className="flex gap-6"><Pill>Scooter</Pill><Pill>Utilitaire</Pill><Pill>Vélo</Pill></div>
          <hr className="hr-wave"/>
          <small className="mono">LÉGENDE</small>
          <div className="flex gap-6 fs-11">
            <span><span style={{ background:"var(--good)", border:"1.4px solid var(--ink)", padding:"0 6px", borderRadius:99 }}>🚐</span> chauffeur</span>
            <span><span style={{ background:"var(--accent)", color:"#fff", padding:"0 6px", borderRadius:99 }}>📍</span> mission</span>
          </div>
        </div>
      </div>
      <Stamp x={520} y={120} rot={4}>refresh 5s</Stamp>
    </div>
  </Win>
);

// === 5A — Alertes / incidents (liste)
const DispatchAlerts_A = () => (
  <Win mid url="dispatcher.transvirex.fr / alertes">
    <Side active="alert" logo="transvirex" role="Dispatcher · Hub Paris-Est" items={dispatchNav}/>
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <AppBar crumbs="Alertes & incidents"
        actions={<div className="flex gap-6"><Pill kind="bad">3 ouverts</Pill><Pill>Tout l&apos;historique</Pill></div>}/>
      <div style={{ padding:16, flex:1 }}>
        <div className="flex gap-6 mb-8">
          <Pill kind="bad">Critiques · 1</Pill>
          <Pill kind="warn">Retards · 4</Pill>
          <Pill>Refus client · 2</Pill>
          <Pill>SAV · 3</Pill>
          <Pill kind="good">Résolus · 12</Pill>
        </div>
        <Box className="solid" style={{ borderColor:"var(--bad)", background:"#fff3f3" }}>
          <div className="flex jc-sb ai-c">
            <div>
              <div className="flex gap-6 ai-c"><Pill kind="bad">🔥 CRITIQUE</Pill><small className="mono">il y a 4 min · #TVX-0046</small></div>
              <div className="script fs-22" style={{ lineHeight:1.05 }}>Sofiane M. — accident léger signalé</div>
              <small className="mono">22 av. Saint-Maur · véhicule TVX-007 · client en attente</small>
            </div>
            <div className="flex gap-6">
              <button className="btn">📞 appeler</button>
              <button className="btn fill">↪ Ré-attribuer #0046</button>
            </div>
          </div>
        </Box>
        <Box className="solid mt-8" title="Retard prévu — TVX-0048 · Maison Dior" sub="auto · embouteillage A4 · +18 min sur l&apos;ETA · client VIP">
          <div className="flex gap-6 mt-4">
            <Pill kind="warn">retard 18&apos;</Pill>
            <Pill>VIP</Pill>
            <button className="btn" style={{ marginLeft:"auto", padding:"3px 10px", fontSize:11 }}>Prévenir client</button>
            <button className="btn fill" style={{ padding:"3px 10px", fontSize:11 }}>Voir mission</button>
          </div>
        </Box>
        <Box className="mt-8" title="Refus client — TVX-0039" sub="hier 17:24 · A. Durand · adresse incorrecte · colis retourné">
          <div className="flex gap-6 mt-4">
            <Pill kind="bad">refus</Pill>
            <Pill>retour au hub</Pill>
            <Pill kind="good">✓ traité</Pill>
          </div>
        </Box>
        <Box className="mt-8" title="Hub surchargé — Paris-Est" sub="auto · 24 missions / cap. 18 entre 12h et 14h">
          <div className="flex gap-6 mt-4">
            <Pill kind="warn">surcharge</Pill>
            <Pill>+6 missions</Pill>
            <button className="btn" style={{ marginLeft:"auto", padding:"3px 10px", fontSize:11 }}>Délester sur Paris-Sud</button>
          </div>
        </Box>
      </div>
    </div>
    <Anno x={210} y={170} w={170} dir="right" rot={-3}>incident en haut,<br/>actions visibles</Anno>
  </Win>
);

// === 5B — Alertes / centre de contrôle
const DispatchAlerts_B = () => (
  <Win wide url="dispatcher.transvirex.fr / centre-de-controle">
    <Side active="alert" logo="transvirex" role="Dispatcher · Hub Paris-Est" items={dispatchNav}/>
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <AppBar crumbs="Centre de contrôle"
        actions={<div className="flex gap-6"><Pill kind="warn">⏵ surveiller</Pill><Pill>🔔 règles</Pill></div>}/>
      <div style={{ flex:1, display:"grid", gridTemplateColumns:"1.2fr .8fr" }}>
        <div style={{ padding:16, borderRight:"1.5px dashed var(--ink)" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
            <KPI label="OUVERTS" value="3" delta="+1 / 1h" kind="bad"/>
            <KPI label="RETARDS" value="4" delta="moy. +12 min" kind="warn"/>
            <KPI label="SLA OK" value="92%" delta="-3 pts" kind="warn"/>
            <KPI label="TEMPS RÉSOL." value="11 min" delta="+2 min"/>
          </div>
          <div className="mono fs-10 muted mt-12">FLUX TEMPS RÉEL</div>
          <Box className="solid">
            <Row style={{ borderStyle:"solid" }} lead="🔥" title="11:34 · #0046 — Accident léger Sofiane M." sub="critique · véhicule TVX-007" end={<Pill kind="bad">!</Pill>}/>
            <Row lead="⏱" title="11:31 · #0048 — Retard prévu +18 min" sub="trafic A4 · client VIP" end={<Pill kind="warn">…</Pill>}/>
            <Row lead="⚠" title="11:18 · #0044 — Colis fragile non scanné" sub="POD incomplet" end={<Pill kind="warn">…</Pill>}/>
            <Row lead="✓" title="11:02 · #0039 — Refus client traité" sub="retour hub validé" end={<Pill kind="good">ok</Pill>}/>
            <Row lead="✓" title="10:55 · #0041 — Livré dans le créneau" sub="auto" end={<Pill kind="good">ok</Pill>}/>
          </Box>
        </div>
        <div style={{ padding:16 }}>
          <div className="script fs-22">Alerte ouverte</div>
          <Box className="solid" style={{ borderColor:"var(--bad)" }}>
            <div className="flex jc-sb">
              <Pill kind="bad">🔥 critique</Pill>
              <small className="mono">il y a 4 min</small>
            </div>
            <div className="script fs-18 mt-4" style={{ lineHeight:1.1 }}>Accident léger — TVX-0046</div>
            <small className="mono">Sofiane Moreau · 🚐 TVX-007 · 22 av. Saint-Maur</small>
            <hr className="hr-wave"/>
            <small className="mono">PROTOCOLE</small>
            <div className="mt-4">
              <div className="flex gap-6 mb-4"><Pill kind="good">✓</Pill> Contact chauffeur</div>
              <div className="flex gap-6 mb-4"><Pill kind="good">✓</Pill> Géolocalisation confirmée</div>
              <div className="flex gap-6 mb-4"><Pill kind="warn">●</Pill> Ré-attribuer mission</div>
              <div className="flex gap-6 mb-4"><Pill>○</Pill> Prévenir client</div>
              <div className="flex gap-6"><Pill>○</Pill> Déclencher assurance</div>
            </div>
            <div className="flex gap-6 mt-8">
              <button className="btn" style={{ flex:1 }}>Marquer non-bloquant</button>
              <button className="btn fill" style={{ flex:1 }}>Action suivante</button>
            </div>
          </Box>
        </div>
      </div>
      <Stamp x={620} y={70} rot={-4}>style cockpit</Stamp>
    </div>
  </Win>
);

window.DispatcherApp = function DispatcherApp() {
  return (
    <div>
      <div className="tab-intro">
        <h1><span className="hl">Web</span><br/>Dispatcher</h1>
        <div>
          <p>Le centre nerveux des opérations. Le dispatcher voit tout, assigne tout, intervient sur tout. Densité d&apos;info élevée mais raccourcis et drag&apos;n&apos;drop pour rester rapide.</p>
          <span className="meta">apps/web-dispatcher · port 3000 · 1280×800 mini</span>
        </div>
      </div>

      <Section n="1" title="Liste / tableau des missions" desc="Vue d&apos;ensemble des missions du jour." />
      <VarRow>
        <Variation label="A — Tableau dense" badge="ops" note="Tableau classique, filtres en haut, dense, idéal en double écran.">
          <DispatchList_A/>
        </Variation>
        <Variation label="B — Kanban par statut" badge="visuel" note="Colonnes par statut, drag&drop entre colonnes pour ré-assigner.">
          <DispatchList_B/>
        </Variation>
      </VarRow>

      <Section n="2" title="Création / assignation d&apos;une mission" desc="Saisir une nouvelle course et l&apos;attribuer." />
      <VarRow>
        <Variation label="A — Wizard 4 étapes" badge="rigoureux" note="Adapté quand les agents débutent. Champs guidés, pas d&apos;oubli.">
          <DispatchCreate_A/>
        </Variation>
        <Variation label="B — Panneau latéral + suggestion" badge="rapide" note="Raccourci ⌘N, panneau qui slide. L&apos;algo propose le meilleur chauffeur.">
          <DispatchCreate_B/>
        </Variation>
      </VarRow>

      <Section n="3" title="Détail d&apos;une mission" desc="Tout ce qui s&apos;est passé, et ce qu&apos;on peut faire." />
      <VarRow>
        <Variation label="A — Split timeline + carte" badge="dense" note="Chronologie à gauche, carte + chauffeur à droite. Pour les superviseurs.">
          <DispatchDetail_A/>
        </Variation>
        <Variation label="B — Fiche narrative" badge="lisible" note="Mise en page éditoriale, état de la mission en grille. Lecture rapide.">
          <DispatchDetail_B/>
        </Variation>
      </VarRow>

      <Section n="4" title="Planning / timeline" desc="Qui fait quoi quand." />
      <VarRow>
        <Variation label="A — Gantt par chauffeur" badge="planification" note="Drag&drop pour réorganiser la journée. Vue ressources humaines.">
          <DispatchPlanning_A/>
        </Variation>
        <Variation label="B — Carte temps réel" badge="opérationnel" note="Carte plein-écran + liste des chauffeurs. Vue ‘où sont mes gens’.">
          <DispatchPlanning_B/>
        </Variation>
      </VarRow>

      <Section n="5" title="Alertes & incidents" desc="Quand quelque chose dérape." />
      <VarRow>
        <Variation label="A — File d&apos;incidents" badge="liste" note="Tri par gravité, actions inline. Classique CRM.">
          <DispatchAlerts_A/>
        </Variation>
        <Variation label="B — Centre de contrôle" badge="cockpit" note="KPIs en haut, flux à gauche, alerte ouverte à droite avec protocole pas-à-pas.">
          <DispatchAlerts_B/>
        </Variation>
      </VarRow>
    </div>
  );
};
