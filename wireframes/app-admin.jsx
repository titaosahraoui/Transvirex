// app-admin.jsx — Web admin wireframes

const adminNav = [
  "GESTION",
  { key:"users",  icon:"👥", label:"Utilisateurs & rôles" },
  { key:"fleet",  icon:"🚐", label:"Flotte" },
  { key:"zones",  icon:"🗺", label:"Zones & tarifs" },
  "RÉFÉRENTIELS",
  { key:"hubs",   icon:"⌂", label:"Hubs" },
  { key:"cli",    icon:"🏢", label:"Clients" },
  "SYSTÈME",
  { key:"audit",  icon:"📜", label:"Audit log" },
  { key:"set",    icon:"⚙", label:"Paramètres" },
];

// === 1A — Utilisateurs (tableau)
const AdminUsers_A = () => (
  <Win wide url="admin.transvirex.fr / utilisateurs">
    <Side active="users" logo="transvirex" role="Admin · Marc D." items={adminNav}/>
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <AppBar crumbs="Gestion / Utilisateurs"
        actions={<div className="flex gap-6"><Pill>⤓ CSV</Pill><Pill kind="warn">＋ Inviter</Pill></div>}/>
      <div style={{ padding:16, flex:1 }}>
        <div className="flex gap-6 mb-8">
          <Pill kind="warn">Tous · 124</Pill>
          <Pill>Actifs · 118</Pill>
          <Pill>Invités · 4</Pill>
          <Pill>Suspendus · 2</Pill>
          <span className="inp box" style={{ marginLeft:"auto", width:240, color:"var(--ink-3)" }}>🔍 nom, email, rôle…</span>
        </div>

        <table className="tbl">
          <thead><tr>
            <th>Nom</th><th>Email</th><th>Rôle</th><th>Hub</th>
            <th>Statut</th><th>Dern. connexion</th><th>2FA</th><th></th>
          </tr></thead>
          <tbody>
            <tr><td><b>Karim Benali</b></td><td className="mono fs-11">karim.b@tvx.fr</td><td><Pill>Chauffeur</Pill></td><td>Paris-Est</td><td><Pill kind="good">actif</Pill></td><td className="mono fs-11">il y a 4 min</td><td>✓</td><td>⋯</td></tr>
            <tr><td>Léa Robert</td><td className="mono fs-11">lea.r@tvx.fr</td><td><Pill kind="warn">Dispatcher</Pill></td><td>Paris-Est</td><td><Pill kind="good">actif</Pill></td><td className="mono fs-11">il y a 2 min</td><td>✓</td><td>⋯</td></tr>
            <tr><td>Marc Dubois</td><td className="mono fs-11">marc.d@tvx.fr</td><td><Pill kind="bad">Admin</Pill></td><td>—</td><td><Pill kind="good">actif</Pill></td><td className="mono fs-11">en ligne</td><td>✓</td><td>⋯</td></tr>
            <tr><td>Camille Petit</td><td className="mono fs-11">camille.p@tvx.fr</td><td><Pill>Facturation</Pill></td><td>—</td><td><Pill kind="good">actif</Pill></td><td className="mono fs-11">hier</td><td>✓</td><td>⋯</td></tr>
            <tr><td>Sofiane Moreau</td><td className="mono fs-11">sofiane.m@tvx.fr</td><td><Pill>Chauffeur</Pill></td><td>Paris-Est</td><td><Pill kind="warn">en pause</Pill></td><td className="mono fs-11">il y a 18 min</td><td>✓</td><td>⋯</td></tr>
            <tr><td>Romain Petit</td><td className="mono fs-11">romain.p@tvx.fr</td><td><Pill>Chauffeur</Pill></td><td>Paris-Est</td><td><Pill kind="good">actif</Pill></td><td className="mono fs-11">il y a 1 h</td><td>—</td><td>⋯</td></tr>
            <tr><td>Yasmine A.</td><td className="mono fs-11">y.a@tvx.fr</td><td><Pill>Direction</Pill></td><td>—</td><td><Pill kind="good">actif</Pill></td><td className="mono fs-11">3 j</td><td>✓</td><td>⋯</td></tr>
            <tr><td>Nicolas Berger</td><td className="mono fs-11">nico.b@tvx.fr</td><td><Pill>Chauffeur</Pill></td><td>Lille</td><td><Pill kind="bad">suspendu</Pill></td><td className="mono fs-11">14 j</td><td>—</td><td>⋯</td></tr>
            <tr><td className="muted">— en attente —</td><td className="mono fs-11">julien@candidat.fr</td><td><Pill>Chauffeur</Pill></td><td>Paris-Sud</td><td><Pill>invité</Pill></td><td className="mono fs-11">jamais</td><td>—</td><td>⋯</td></tr>
          </tbody>
        </table>

        <div className="flex jc-sb mt-12">
          <small className="mono muted">9 / 124 · trié par activité</small>
          <div className="flex gap-4"><Pill>‹</Pill><Pill kind="warn">1</Pill><Pill>2</Pill><Pill>…</Pill><Pill>14</Pill><Pill>›</Pill></div>
        </div>
      </div>
    </div>
    <Anno x={250} y={70} w={180} dir="right" rot={-3}>filtres + recherche<br/>= 90% des usages</Anno>
  </Win>
);

// === 1B — Utilisateurs (matrice rôles & permissions)
const AdminUsers_B = () => {
  const roles = [
    { name:"Chauffeur",   k:"good" },
    { name:"Dispatcher",  k:"warn" },
    { name:"Facturation", k:"" },
    { name:"Direction",   k:"" },
    { name:"Admin",       k:"bad" },
  ];
  const perms = [
    ["Voir missions du jour",            "✓","✓","✓","✓","✓"],
    ["Créer / assigner missions",        "—","✓","—","—","✓"],
    ["Modifier prix / facture",          "—","—","✓","—","✓"],
    ["Accéder dashboard",                "—","✓","—","✓","✓"],
    ["Voir données financières",         "—","—","✓","✓","✓"],
    ["Gérer la flotte",                  "—","—","—","—","✓"],
    ["Gérer utilisateurs & rôles",       "—","—","—","—","✓"],
    ["Exporter données (RGPD)",          "—","—","✓","✓","✓"],
  ];
  return (
    <Win mid url="admin.transvirex.fr / roles ?vue=matrice">
      <Side active="users" logo="transvirex" role="Admin · Marc D." items={adminNav}/>
      <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
        <AppBar crumbs="Rôles & permissions"
          actions={<div className="flex gap-6"><Pill>＋ Rôle</Pill><Pill kind="warn">💾 Enregistrer</Pill></div>}/>
        <div style={{ padding:16, flex:1 }}>
          <div className="script fs-28" style={{ lineHeight:1 }}>Matrice des permissions</div>
          <small className="mono">5 rôles · 24 permissions · cochez ce que chaque rôle peut faire.</small>

          <Box className="solid mt-12" style={{ padding:0, overflow:"hidden" }}>
            <table className="tbl" style={{ tableLayout:"fixed" }}>
              <thead>
                <tr>
                  <th style={{ width:"38%" }}>Permission</th>
                  {roles.map((r,i)=>(
                    <th key={i} style={{ textAlign:"center" }}>
                      <Pill kind={r.k}>{r.name}</Pill>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perms.map((p, i) => (
                  <tr key={i}>
                    <td>{p[0]}</td>
                    {p.slice(1).map((v, j) => (
                      <td key={j} style={{ textAlign:"center" }}>
                        {v === "✓"
                          ? <span style={{ display:"inline-block", width:18, height:18, border:"1.4px solid var(--ink)", background:"var(--good)", borderRadius:4, lineHeight:"15px", fontSize:13 }}>✓</span>
                          : <span style={{ display:"inline-block", width:18, height:18, border:"1.4px dashed var(--ink)", borderRadius:4 }}/>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>

          <div className="flex jc-sb mt-12">
            <small className="mono muted">💡 cliquez une case pour activer / désactiver</small>
            <div className="flex gap-6">
              <button className="btn">Réinitialiser</button>
              <button className="btn fill">Appliquer aux 124 utilisateurs</button>
            </div>
          </div>
        </div>
      </div>
      <Stamp x={440} y={70} rot={5}>RBAC visuel</Stamp>
    </Win>
  );
};

// === 2A — Flotte (tableau)
const AdminFleet_A = () => (
  <Win wide url="admin.transvirex.fr / flotte">
    <Side active="fleet" logo="transvirex" role="Admin · Marc D." items={adminNav}/>
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <AppBar crumbs="Flotte"
        actions={<div className="flex gap-6"><Pill>⤓</Pill><Pill kind="warn">＋ Véhicule</Pill></div>}/>
      <div style={{ padding:16, flex:1 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
          <KPI label="TOTAL" value="48"/>
          <KPI label="ACTIFS" value="42" delta="88%" kind="good"/>
          <KPI label="ENTRETIEN" value="3" kind="warn"/>
          <KPI label="HORS-SERV." value="2" delta="immo. 4 200€" kind="bad"/>
          <KPI label="ÉLECTRIQUES" value="62%" delta="+8 pts" kind="good"/>
        </div>

        <div className="flex gap-6 mt-12 mb-8">
          <Pill kind="warn">Tous</Pill>
          <Pill>🛵 Scooters · 14</Pill>
          <Pill>🚐 Utilitaires · 18</Pill>
          <Pill>🚲 Vélos cargo · 12</Pill>
          <Pill>🚛 Camions · 4</Pill>
        </div>

        <table className="tbl">
          <thead><tr>
            <th>Immat.</th><th>Type</th><th>Modèle</th><th>Hub</th><th>Statut</th>
            <th>Affecté</th><th>Km</th><th>Prochain entretien</th><th>Assurance</th>
          </tr></thead>
          <tbody>
            <tr><td><b>TVX-019</b></td><td>🛵</td><td>Piaggio Liberty 50</td><td>Paris-Est</td><td><Pill kind="good">en service</Pill></td><td>K. Benali</td><td className="mono">12 408</td><td className="mono">14 j</td><td><Pill kind="good">✓</Pill></td></tr>
            <tr><td><b>TVX-007</b></td><td>🚐</td><td>Renault Kangoo E-Tech</td><td>Paris-Est</td><td><Pill kind="bad">accident</Pill></td><td>S. Moreau</td><td className="mono">38 211</td><td className="mono">à voir</td><td><Pill kind="good">✓</Pill></td></tr>
            <tr><td><b>TVX-022</b></td><td>🚲</td><td>Urban Arrow Cargo</td><td>Paris-Est</td><td><Pill kind="good">en service</Pill></td><td>R. Petit</td><td className="mono">4 052</td><td className="mono">28 j</td><td><Pill kind="good">✓</Pill></td></tr>
            <tr><td><b>TVX-024</b></td><td>🚲</td><td>Urban Arrow Cargo</td><td>Paris-Est</td><td><Pill kind="good">en service</Pill></td><td>L. Tran</td><td className="mono">3 770</td><td className="mono">32 j</td><td><Pill kind="good">✓</Pill></td></tr>
            <tr><td><b>TVX-101</b></td><td>🚐</td><td>Citroën Berlingo Élec.</td><td>Paris-Sud</td><td><Pill kind="warn">entretien</Pill></td><td>—</td><td className="mono">52 318</td><td className="mono">en cours</td><td><Pill kind="good">✓</Pill></td></tr>
            <tr><td><b>TVX-205</b></td><td>🚛</td><td>Iveco Daily</td><td>Lyon</td><td><Pill kind="good">en service</Pill></td><td>M. Costa</td><td className="mono">88 740</td><td className="mono">2 j</td><td><Pill kind="warn">expire 30j</Pill></td></tr>
            <tr><td><b>TVX-309</b></td><td>🛵</td><td>NIU NQi GTS</td><td>Lille</td><td><Pill kind="bad">hors service</Pill></td><td>—</td><td className="mono">21 008</td><td className="mono">—</td><td><Pill kind="bad">expirée</Pill></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </Win>
);

// === 2B — Flotte (vue garage / cartes)
const AdminFleet_B = () => {
  const Card = ({ id, icon, model, status, sk, driver, soc, km, next }) => (
    <Box className="solid">
      <div className="flex jc-sb">
        <div className="flex ai-c gap-6">
          <div style={{ width:36, height:36, border:"1.5px solid var(--ink)", borderRadius:8, background:"#fff5d6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{icon}</div>
          <div>
            <b className="fs-13">{id}</b>
            <small className="mono" style={{ display:"block" }}>{model}</small>
          </div>
        </div>
        <Pill kind={sk}>{status}</Pill>
      </div>
      <hr className="hr-wave"/>
      <div className="fs-12">👤 {driver || <span className="muted">— non affecté —</span>}</div>
      <div className="fs-12 mt-4">🔋 batterie / SOC</div>
      <div style={{ height:8, border:"1.2px solid var(--ink)", borderRadius:4, background:"#fffdf6", marginTop:4 }}>
        <div style={{ width: soc+"%", height:"100%", background: soc < 25 ? "var(--bad)" : soc < 60 ? "var(--accent)" : "var(--good)", borderRight:"1.2px solid var(--ink)" }}/>
      </div>
      <div className="flex jc-sb mt-8 mono fs-11">
        <span>📏 {km} km</span><span>🔧 {next}</span>
      </div>
    </Box>
  );
  return (
    <Win wide url="admin.transvirex.fr / flotte ?vue=garage">
      <Side active="fleet" logo="transvirex" role="Admin · Marc D." items={adminNav}/>
      <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
        <AppBar crumbs="Flotte · vue garage"
          actions={<div className="flex gap-6"><Pill>≡ Tableau</Pill><Pill kind="warn">▦ Garage</Pill><Pill>🗺 Carte</Pill></div>}/>
        <div style={{ padding:16, flex:1 }}>
          <div className="script fs-22 mb-8">Hub Paris-Est · 11 véhicules présents / 14 affectés</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12 }}>
            <Card id="TVX-019" icon="🛵" model="Piaggio Liberty 50" status="en service" sk="good" driver="K. Benali" soc={68} km="12 408" next="14 j"/>
            <Card id="TVX-007" icon="🚐" model="Kangoo E-Tech" status="accident" sk="bad" driver="S. Moreau" soc={42} km="38 211" next="à voir"/>
            <Card id="TVX-022" icon="🚲" model="Urban Arrow" status="en service" sk="good" driver="R. Petit" soc={88} km="4 052" next="28 j"/>
            <Card id="TVX-024" icon="🚲" model="Urban Arrow" status="en service" sk="good" driver="L. Tran" soc={74} km="3 770" next="32 j"/>
            <Card id="TVX-031" icon="🛵" model="NIU NQi GTS" status="en charge" sk="warn" driver="" soc={22} km="14 920" next="—"/>
            <Card id="TVX-033" icon="🛵" model="NIU NQi GTS" status="en service" sk="good" driver="A. Diallo" soc={56} km="9 740" next="44 j"/>
            <Card id="TVX-040" icon="🚐" model="Berlingo Élec." status="entretien" sk="warn" driver="" soc={100} km="52 318" next="en cours"/>
            <Card id="TVX-044" icon="🚐" model="Master frigorifique" status="en service" sk="good" driver="N. Dupont" soc={62} km="74 120" next="11 j"/>
          </div>
        </div>
      </div>
      <Anno x={130} y={70} w={170} dir="right" rot={3}>cartes = SOC visible<br/>= utile au quotidien</Anno>
    </Win>
  );
};

// === 3A — Zones & tarifs (carte + grille)
const AdminZones_A = () => (
  <Win wide url="admin.transvirex.fr / zones-tarifs">
    <Side active="zones" logo="transvirex" role="Admin · Marc D." items={adminNav}/>
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <AppBar crumbs="Zones & tarifs"
        actions={<div className="flex gap-6"><Pill>＋ Zone</Pill><Pill>＋ Grille</Pill><Pill kind="warn">💾 Publier</Pill></div>}/>
      <div style={{ flex:1, display:"grid", gridTemplateColumns:"1.1fr 1fr" }}>
        <div style={{ borderRight:"1.5px dashed var(--ink)", padding:14 }}>
          <small className="mono">CARTE DES ZONES — PARIS</small>
          <MapView h={300} route={false} pins={[
            { x:30, y:38, kind:"acc", label:"Zone A · cœur" },
            { x:55, y:50, kind:"", label:"Zone B · péri." },
            { x:75, y:60, kind:"muted", label:"Zone C · banlieue" },
            { x:22, y:78, kind:"muted", icon:"⌂", label:"Hub Est" },
          ]}/>
          <div className="flex gap-6 mt-8">
            <Pill kind="warn">A — 4,50€</Pill>
            <Pill>B — 6,50€</Pill>
            <Pill>C — 9,00€</Pill>
            <Pill>Hors zone — devis</Pill>
          </div>
          <Box className="solid mt-12" title="Zone sélectionnée : A · cœur de Paris" sub="75001-75011 · ~3 028 livraisons / mois">
            <div className="flex gap-6 mt-4 mono fs-11">
              <span>📏 rayon : 4,5 km</span>
              <span>🚦 trafic : élevé</span>
              <span>💶 marge cible : 38%</span>
            </div>
          </Box>
        </div>
        <div style={{ padding:14 }}>
          <div className="script fs-22">Grille tarifaire</div>
          <small className="mono">applicable dès le 1er juin 2026</small>
          <table className="tbl mt-8">
            <thead><tr><th>Service</th><th>Zone A</th><th>Zone B</th><th>Zone C</th><th>Hors</th></tr></thead>
            <tbody>
              <tr><td>Express ≤ 2h</td><td>4,50€</td><td>6,50€</td><td>9,00€</td><td>devis</td></tr>
              <tr><td>Standard J+0</td><td>3,80€</td><td>5,40€</td><td>7,50€</td><td>devis</td></tr>
              <tr><td>Programmée</td><td>3,20€</td><td>4,90€</td><td>6,80€</td><td>devis</td></tr>
              <tr><td><Pill kind="warn">VIP</Pill> Express</td><td>9,00€</td><td>12,00€</td><td>16,00€</td><td>devis</td></tr>
              <tr><td>Fragile (+)</td><td>+1,00€</td><td>+1,50€</td><td>+2,00€</td><td>+2,50€</td></tr>
              <tr><td>Frais / froid (+)</td><td>+1,50€</td><td>+2,00€</td><td>+2,50€</td><td>+3,00€</td></tr>
            </tbody>
          </table>
          <Box className="mt-12" title="Surcharges">
            <div className="flex gap-6 mt-4">
              <Pill>Nuit 21h-6h · +30%</Pill>
              <Pill>Week-end · +15%</Pill>
              <Pill>Jour férié · +50%</Pill>
              <Pill kind="warn">Météo extrême · +20%</Pill>
            </div>
          </Box>
        </div>
      </div>
    </div>
    <Anno x={500} y={130} w={180} dir="left" rot={-3}>carte ↔ grille<br/>liées par sélection</Anno>
  </Win>
);

// === 3B — Zones & tarifs (simulateur)
const AdminZones_B = () => (
  <Win mid url="admin.transvirex.fr / tarifs / simuler">
    <Side active="zones" logo="transvirex" role="Admin · Marc D." items={adminNav}/>
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <AppBar crumbs="Tarifs / Simulateur"/>
      <div style={{ padding:18, flex:1, display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
        <div>
          <div className="script fs-28">Tester un tarif</div>
          <small className="mono">Voir le prix avant de publier une grille.</small>

          <Box className="solid mt-12" title="Trajet">
            <div className="flex ai-c gap-6">
              <span className="mono fs-11">DE</span>
              <span className="inp box" style={{ flex:1 }}>Hub Paris-Est</span>
            </div>
            <div className="flex ai-c gap-6 mt-4">
              <span className="mono fs-11">À</span>
              <span className="inp box" style={{ flex:1 }}>14 rue Daguerre, 75014</span>
            </div>
            <small className="mono muted mt-4">≈ 5,4 km · Zone A → B</small>
          </Box>

          <Box className="solid mt-8" title="Détails">
            <div className="flex gap-6">
              <span className="inp box" style={{ flex:1 }}>1 colis</span>
              <span className="inp box" style={{ flex:1 }}>3,2 kg</span>
            </div>
            <div className="flex gap-6 mt-6">
              <Pill kind="warn">Express ≤ 2h</Pill><Pill>Standard</Pill><Pill>Programmée</Pill>
            </div>
            <div className="flex gap-6 mt-6">
              <Pill kind="warn">Fragile</Pill><Pill>Frais</Pill><Pill>VIP</Pill>
            </div>
            <div className="flex gap-6 mt-6">
              <Pill>Jour ouvré</Pill><Pill>Week-end</Pill><Pill>Nuit</Pill>
            </div>
          </Box>

          <Box className="solid mt-8" title="Grille appliquée">
            <div className="flex gap-6 mt-4">
              <Pill>Grille mars 2026</Pill>
              <Pill kind="warn">▶ Grille juin 2026 (brouillon)</Pill>
            </div>
          </Box>
        </div>

        <div>
          <Box className="dark" style={{ borderRadius:14 }}>
            <small className="mono" style={{ color:"#fff7d6", opacity:.7 }}>PRIX SIMULÉ</small>
            <div className="script" style={{ fontSize:56, lineHeight:1 }}>8,40 €</div>
            <small className="mono" style={{ color:"#fff7d6", opacity:.7 }}>HT · soit 10,08€ TTC</small>
          </Box>

          <Box className="solid mt-8" title="Décomposition">
            <table className="tbl">
              <tbody>
                <tr><td>Base Zone B Express</td><td className="mono tar">6,50€</td></tr>
                <tr><td>Supplément fragile</td><td className="mono tar">+1,50€</td></tr>
                <tr><td>Distance &gt; 5 km</td><td className="mono tar">+0,40€</td></tr>
                <tr><td className="muted">Jour ouvré</td><td className="mono tar muted">+0,00€</td></tr>
                <tr><td><b>Total HT</b></td><td className="mono tar"><b>8,40€</b></td></tr>
              </tbody>
            </table>
          </Box>

          <Box className="mt-8" title="Comparaison avec grille actuelle">
            <div className="flex jc-sb">
              <span>Grille mars 2026</span>
              <span className="mono">7,80€</span>
            </div>
            <div className="flex jc-sb">
              <span><b>Grille juin 2026</b></span>
              <span className="mono"><b>8,40€</b></span>
            </div>
            <div className="flex jc-sb">
              <span>Différence</span>
              <Pill kind="warn">+0,60€ · +7,7%</Pill>
            </div>
          </Box>

          <div className="flex gap-6 mt-12">
            <button className="btn">Modifier la grille</button>
            <button className="btn fill" style={{ flex:1 }}>Publier juin 2026 →</button>
          </div>
        </div>
      </div>
    </div>
    <Stamp x={500} y={70} rot={-5}>Simulateur</Stamp>
  </Win>
);

window.AdminApp = function AdminApp() {
  return (
    <div>
      <div className="tab-intro">
        <h1><span className="hl">Web</span><br/>Admin</h1>
        <div>
          <p>Administration système : qui peut faire quoi, quels véhicules roulent, comment on facture. Outil à faible fréquence d&apos;usage mais haute conséquence — chaque action est tracée, chaque changement publiable.</p>
          <span className="meta">apps/web-admin · port 3002 · accès restreint</span>
        </div>
      </div>

      <Section n="1" title="Utilisateurs & rôles" desc="Annuaire interne et droits d&apos;accès." />
      <VarRow>
        <Variation label="A — Annuaire" badge="liste" note="Tableau filtrable, 2FA, dernière connexion. Vue opérationnelle.">
          <AdminUsers_A/>
        </Variation>
        <Variation label="B — Matrice rôles × permissions" badge="config" note="RBAC visuel : 1 ligne par permission, 1 colonne par rôle.">
          <AdminUsers_B/>
        </Variation>
      </VarRow>

      <Section n="2" title="Flotte (véhicules)" desc="Tous les véhicules, leur état, leur affectation." />
      <VarRow>
        <Variation label="A — Tableau + KPIs" badge="dense" note="Format CRM, immatriculations, entretien, assurance. Pour les gestionnaires.">
          <AdminFleet_A/>
        </Variation>
        <Variation label="B — Vue ‘garage’" badge="visuel" note="Cartes avec batterie / SOC, idéal pour flottes électriques.">
          <AdminFleet_B/>
        </Variation>
      </VarRow>

      <Section n="3" title="Tarification & zones" desc="Combien coûte chaque livraison, par zone et type." />
      <VarRow>
        <Variation label="A — Carte + grille" badge="référentiel" note="Zones sur carte, grille tarifaire complète. Édition à plat.">
          <AdminZones_A/>
        </Variation>
        <Variation label="B — Simulateur" badge="opérationnel" note="Tester un trajet avant de publier une grille. Évite les surprises.">
          <AdminZones_B/>
        </Variation>
      </VarRow>
    </div>
  );
};
