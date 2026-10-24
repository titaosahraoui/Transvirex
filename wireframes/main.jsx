// main.jsx — shell, tabs, tweaks

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "regular",
  "sketch": "sketchy",
  "anno": true,
  "tab": "driver"
}/*EDITMODE-END*/;

const TABS = [
  { id: "overview",   icon: "✶", label: "Vue d'ensemble" },
  { id: "driver",     icon: "📱", label: "Mobile Driver" },
  { id: "dispatcher", icon: "🎛", label: "Web Dispatcher" },
  { id: "dashboard",  icon: "📊", label: "Web Dashboard" },
  { id: "admin",      icon: "⚙", label: "Web Admin" },
];

function Overview() {
  const Card = ({ tag, port, name, sub, who, screens, color, tabId }) => (
    <Box className="solid" style={{ position:"relative" }}>
      <div className="flex jc-sb ai-start">
        <div>
          <Pill kind={color}>{tag}</Pill>
          <div className="script" style={{ fontSize: 32, lineHeight: 1, marginTop: 6 }}>{name}</div>
          <small className="mono">{sub}</small>
        </div>
        <span className="mono fs-11" style={{ color:"var(--ink-3)" }}>{port}</span>
      </div>
      <hr className="hr-wave"/>
      <small className="mono">UTILISATEURS</small>
      <div className="fs-13">{who}</div>
      <small className="mono mt-8" style={{ display:"block" }}>ÉCRANS CLÉS</small>
      <div className="flex gap-4 mt-4" style={{ flexWrap:"wrap" }}>
        {screens.map((s, i) => <Pill key={i}>{s}</Pill>)}
      </div>
    </Box>
  );

  return (
    <div>
      <div className="tab-intro">
        <h1><span className="hl">transvirex</span><br/>4 apps · 1 chaîne</h1>
        <div>
          <p>Plateforme de logistique express. Chaque application sert un acteur précis de la chaîne de livraison. Les wireframes ci-dessous explorent <b>2 directions par écran clé</b>, en basse fidélité pour cadrer la conversation avant le hi-fi.</p>
          <span className="meta">livraison express · 1 colis · A → B · type coursier</span>
        </div>
      </div>

      <div style={{ padding:"18px 26px 8px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:16, maxWidth:1100 }}>
          <Card
            tag="📱 mobile" port="React Native" color="good"
            name="Mobile Driver"
            sub="apps/mobile-driver"
            who="Chauffeurs & livreurs sur le terrain"
            screens={["Tournée du jour","Détail + nav","POD","Historique & gains","Messages"]}
          />
          <Card
            tag="🎛 web" port="port 3000" color="warn"
            name="Web Dispatcher"
            sub="apps/web-dispatcher"
            who="Dispatcher · responsable hub"
            screens={["Missions","Création","Détail","Planning","Alertes"]}
          />
          <Card
            tag="📊 web" port="port 3001" color=""
            name="Web Dashboard"
            sub="apps/web-dashboard"
            who="Direction · logistique"
            screens={["KPIs","Chauffeurs","Ponctualité","Coûts","Zones"]}
          />
          <Card
            tag="⚙ web" port="port 3002" color="bad"
            name="Web Admin"
            sub="apps/web-admin"
            who="Admin système"
            screens={["Utilisateurs","Rôles","Flotte","Tarifs"]}
          />
        </div>

        <div style={{ marginTop:24, maxWidth:1100 }}>
          <small className="mono">FLUX MÉTIER · 1 mission de bout en bout</small>
          <div className="flex ai-c gap-8 mt-8" style={{ overflowX:"auto", paddingBottom:6 }}>
            {[
              ["Dispatcher", "crée une mission", "warn"],
              ["Admin", "appliqué tarif zone", ""],
              ["Driver", "accepte sur mobile", "good"],
              ["Driver", "scan + nav + POD", "good"],
              ["Dispatcher", "voit livraison ok", "warn"],
              ["Dashboard", "KPIs mis à jour", ""],
            ].map(([who, what, kind], i) => (
              <React.Fragment key={i}>
                <Box className="solid" style={{ minWidth:180 }}>
                  <Pill kind={kind}>{who}</Pill>
                  <div className="fs-13 mt-4">{what}</div>
                </Box>
                {i < 5 && <span className="mono" style={{ fontSize:22, color:"var(--ink-3)" }}>→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div style={{ marginTop:24, padding:"14px 18px", border:"1.4px dashed var(--ink)", borderRadius:12, background:"#fffaee", maxWidth:1100 }}>
          <div className="script fs-22" style={{ lineHeight:1 }}>Comment lire ces wireframes</div>
          <ul style={{ margin:"8px 0 0", paddingLeft:18, lineHeight:1.5, fontSize:13.5 }}>
            <li><b>2 variations par écran</b> — explorer largement avant de figer.</li>
            <li><b>Annotations à la main</b> — l&apos;intention derrière chaque choix (toggle &laquo; Annotations &raquo;).</li>
            <li><b>Tweaks en bas à droite</b> — densité, niveau d&apos;esquisse, annotations.</li>
            <li><b>Pas de couleurs de marque</b> — neutre exprès. La direction visuelle viendra en hi-fi.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = React.useState(t.tab || "overview");

  React.useEffect(() => {
    document.body.dataset.density = t.density;
    document.body.dataset.sketch = t.sketch;
    document.body.dataset.anno = t.anno ? "on" : "off";
  }, [t.density, t.sketch, t.anno]);

  const onTab = (id) => { setTab(id); setTweak("tab", id); window.scrollTo({ top: 0 }); };

  return (
    <div className="paper-grid" style={{ minHeight:"100vh", backgroundAttachment:"fixed" }}>
      <header className="topbar">
        <div>
          <div className="brand">transvirex<span className="dot">.</span></div>
          <div className="brand-sub">wireframes · plateforme logistique · v0.1 · 23 mai 2026</div>
        </div>
        <nav className="tabs" role="tablist">
          {TABS.map(x => (
            <button
              key={x.id}
              role="tab"
              aria-selected={tab === x.id}
              className="tab"
              onClick={() => onTab(x.id)}
            >
              <span className="ico">{x.icon}</span>{x.label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {tab === "overview"   && <Overview/>}
        {tab === "driver"     && <DriverApp/>}
        {tab === "dispatcher" && <DispatcherApp/>}
        {tab === "dashboard"  && <DashboardApp/>}
        {tab === "admin"      && <AdminApp/>}
      </main>

      <footer className="foot">
        <div className="stars">✶ ✶ ✶</div>
        <div>basse fidélité · pour explorer la structure et les flux · 4 applications · 17 écrans clés · 34 variations</div>
      </footer>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Affichage"/>
        <TweakRadio label="Densité" value={t.density}
          options={["compact","regular","comfy"]}
          onChange={(v) => setTweak("density", v)}/>
        <TweakRadio label="Tracé" value={t.sketch}
          options={["sketchy","clean"]}
          onChange={(v) => setTweak("sketch", v)}/>
        <TweakToggle label="Annotations" value={t.anno}
          onChange={(v) => setTweak("anno", v)}/>
        <TweakSection label="Navigation"/>
        <TweakSelect label="Onglet"
          value={tab}
          options={TABS.map(x => ({ value: x.id, label: x.label }))}
          onChange={onTab}/>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
