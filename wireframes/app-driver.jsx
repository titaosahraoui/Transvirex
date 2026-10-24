// app-driver.jsx — Mobile driver wireframes

const DriverTabBar = ({ active = 0 }) => (
  <TabBar
    active={active}
    items={[
      { icon: "📋", label: "Courses" },
      { icon: "🗺", label: "Carte" },
      { icon: "💶", label: "Gains" },
      { icon: "💬", label: "Messages" },
      { icon: "👤", label: "Moi" },
    ]}
  />
);

// === 1A — Liste des courses (carte chronologique)
const DriverList_A = () => (
  <Phone>
    <div className="flex jc-sb ai-c">
      <div>
        <div className="script fs-22" style={{ lineHeight: 1 }}>Bonjour Karim</div>
        <small className="mono">Mar. 23 mai · Service de 08:00 à 17:00</small>
      </div>
      <Pill kind="good">EN LIGNE</Pill>
    </div>

    <div className="flex gap-6">
      <Box className="tint" style={{ flex: 1, padding: 6 }}>
        <small className="mono">À LIVRER</small>
        <div className="script fs-22" style={{ lineHeight: 1 }}>8</div>
      </Box>
      <Box className="solid" style={{ flex: 1, padding: 6 }}>
        <small className="mono">FAITES</small>
        <div className="script fs-22" style={{ lineHeight: 1 }}>3</div>
      </Box>
      <Box className="solid" style={{ flex: 1, padding: 6 }}>
        <small className="mono">KM</small>
        <div className="script fs-22" style={{ lineHeight: 1 }}>27</div>
      </Box>
    </div>

    <div className="mono fs-10 muted" style={{ marginTop: 4 }}>MAINTENANT — 11:24</div>
    <Row lead="04" title="Mme Lefèvre" sub="14 rue Daguerre, 75014" end={<Pill kind="warn">URGENT</Pill>} />
    <div className="mono fs-10 muted" style={{ marginTop: 4 }}>ENSUITE</div>
    <Row lead="05" title="Bistrot du Coin" sub="22 av. Parmentier · 12h–14h" end="11:50" />
    <Row lead="06" title="J. Mercier" sub="9 rue Oberkampf" end="12:15" />
    <Row lead="07" title="Pharma Centre" sub="St-Antoine · fragile" end="12:40" />

    <div style={{ marginTop: "auto" }}>
      <button className="btn fill block">▶ Démarrer ma tournée</button>
    </div>
    <DriverTabBar active={0} />

    <Anno x={188} y={48} w={120} dir="left">on/off
      <br />en 1 tap</Anno>
    <Anno x={6} y={300} w={150} dir="right" rot={4}>course en cours<br />toujours en tête</Anno>
  </Phone>
);

// === 1B — Liste des courses (vue carte + bottom-sheet)
const DriverList_B = () => (
  <Phone>
    <div className="flex jc-sb ai-c">
      <div className="script fs-18">Ma tournée du jour</div>
      <Pill>11/14</Pill>
    </div>
    <MapView h={210} route pins={[
      { x: 18, y: 75, kind: "muted", icon:"●", label: "Hub" },
      { x: 36, y: 58, kind: "driver", icon:"🚐", label: "Moi" },
      { x: 56, y: 42, kind: "acc", icon:"📦", label: "#04" },
      { x: 78, y: 30, kind: "muted", icon:"📦", label: "#05" },
      { x: 70, y: 78, kind: "muted", icon:"📦", label: "#06" },
    ]} />

    <Box className="solid" style={{ padding: 8 }}>
      <div className="flex jc-sb ai-c">
        <div>
          <small className="mono">PROCHAINE LIVRAISON</small>
          <div className="script fs-18" style={{ lineHeight: 1.05 }}>📦 #04 — Mme Lefèvre</div>
          <small className="mono">1.2 km · 6 min · 14 rue Daguerre</small>
        </div>
        <button className="btn warn">Go</button>
      </div>
    </Box>
    <Row lead="05" title="Bistrot du Coin" sub="14h max · 22 av. Parmentier" end="11:50" />
    <Row lead="06" title="J. Mercier" sub="Étage 4 · code 8521B" end="12:15" />

    <DriverTabBar active={1} />

    <Anno x={170} y={150} w={130} dir="left" rot={-4}>itinéraire<br />optimisé auto</Anno>
  </Phone>
);

// === 2A — Détail de course + nav (action-first)
const DriverDetail_A = () => (
  <Phone>
    <div className="flex ai-c gap-6">
      <span className="kbd">←</span>
      <span className="script fs-22">Course #04</span>
      <Pill kind="warn" style={{ marginLeft: "auto" }}>URGENT</Pill>
    </div>

    <MapView h={170} pins={[
      { x: 24, y: 70, kind: "driver", icon:"🚐", label: "Moi" },
      { x: 70, y: 30, kind: "acc", icon:"📍", label: "Mme Lefèvre" },
    ]} />

    <Box className="solid">
      <div className="flex jc-sb ai-c">
        <div>
          <small className="mono">CLIENT</small>
          <div className="script fs-18" style={{lineHeight:1.05}}>Mme Lefèvre · 06 12 ••• ••</div>
        </div>
        <div className="flex gap-6">
          <button className="btn">📞</button>
          <button className="btn">💬</button>
        </div>
      </div>
      <hr className="hr-wave"/>
      <small className="mono">ADRESSE</small>
      <div className="fs-13 fw-7">14 rue Daguerre, 75014 Paris</div>
      <small className="mono">Code: 4587B · Étage 3 · Bât. C</small>
    </Box>

    <Box>
      <small className="mono">COLIS</small>
      <div className="flex jc-sb">
        <div>
          <div className="fw-7">1 colis · 3.2 kg</div>
          <small className="mono">#TVX-2410-0042 · fragile</small>
        </div>
        <Pill>📷 photo</Pill>
      </div>
    </Box>

    <div className="flex gap-8" style={{ marginTop: "auto" }}>
      <button className="btn" style={{ flex: 1 }}>🚫 Incident</button>
      <button className="btn fill" style={{ flex: 2 }}>🧭 Naviguer · 6 min</button>
    </div>
    <button className="btn good block">✓ Marquer livré</button>

    <Anno x={10} y={420} w={140} dir="right" rot={3}>2 actions toujours<br />à portée de pouce</Anno>
  </Phone>
);

// === 2B — Détail de course + nav (carte plein-écran)
const DriverDetail_B = () => (
  <Phone>
    <MapView h={420} pins={[
      { x: 22, y: 80, kind: "driver", icon:"🚐", label: "Vous" },
      { x: 72, y: 28, kind: "acc", icon:"📍", label: "Arrivée" },
    ]} style={{ borderRadius: 14 }}/>

    <div style={{
      position:"absolute", left:14, right:14, top:36,
      display:"flex", gap:8,
    }}>
      <span className="kbd">←</span>
      <Box className="solid" style={{ flex:1, padding:"4px 8px" }}>
        <div className="flex jc-sb ai-c">
          <span className="fs-13 fw-7">14 rue Daguerre</span>
          <span className="mono fs-11">6 min · 1.2 km</span>
        </div>
      </Box>
    </div>

    <div style={{
      position:"absolute", left:14, right:14, bottom:74,
      borderRadius:14, padding:"10px 12px",
      background:"#fffdf6", border:"1.6px solid var(--ink)",
      boxShadow:"0 -4px 0 rgba(0,0,0,.04)",
    }}>
      <div className="flex jc-sb ai-c">
        <div>
          <small className="mono">PROCHAINE ÉTAPE</small>
          <div className="script fs-18">↰ Tourner à gauche</div>
          <small className="mono">dans 180 m — rue Boulard</small>
        </div>
        <button className="btn warn">Arrivé ?</button>
      </div>
      <hr className="hr-wave"/>
      <div className="flex jc-sb">
        <small className="mono">Mme Lefèvre · code 4587B</small>
        <div className="flex gap-6">
          <Pill>📞</Pill>
          <Pill>💬</Pill>
        </div>
      </div>
    </div>

    <Anno x={150} y={250} w={130} dir="left" rot={-6}>nav intégrée,<br />pas d&apos;app externe</Anno>
  </Phone>
);

// === 3A — Preuve de livraison (étape par étape)
const DriverPOD_A = () => (
  <Phone>
    <div className="flex ai-c gap-6">
      <span className="kbd">←</span>
      <span className="script fs-22">Preuve de livraison</span>
    </div>
    <div className="flex gap-4 ai-c mono fs-11">
      <span style={{ background:"var(--ink)", color:"#fff", borderRadius:99, padding:"1px 7px" }}>1</span>
      <span>Scan</span>
      <span style={{ flex:1, height:2, background:"var(--ink)" }}/>
      <span style={{ background:"var(--ink)", color:"#fff", borderRadius:99, padding:"1px 7px" }}>2</span>
      <span>Photo</span>
      <span style={{ flex:1, height:2, background:"rgba(31,29,26,.25)", borderTop:"1.4px dashed var(--ink)" }}/>
      <span style={{ background:"#fff", border:"1.4px solid var(--ink)", borderRadius:99, padding:"0 7px" }}>3</span>
      <span>Signer</span>
    </div>

    <Box className="solid" style={{ padding:0, overflow:"hidden" }}>
      <ImgPh w="100%" h={200} label="caméra · scan code-barres" style={{ borderRadius:0, border:0 }}/>
      <div style={{ padding:8 }}>
        <div className="flex jc-sb">
          <small className="mono">DERNIER SCAN</small>
          <Pill kind="good">✓</Pill>
        </div>
        <div className="script fs-18" style={{ lineHeight:1.05 }}>#TVX-2410-0042</div>
        <small className="mono">Mme Lefèvre · 3.2 kg · fragile</small>
      </div>
    </Box>

    <Box>
      <small className="mono">DESTINATAIRE</small>
      <div className="flex gap-6 mt-4">
        <Pill kind="good">✓ Client</Pill>
        <Pill>Tiers</Pill>
        <Pill>Boîte aux lettres</Pill>
        <Pill>Concierge</Pill>
      </div>
    </Box>

    <div className="flex gap-8" style={{ marginTop:"auto" }}>
      <button className="btn" style={{ flex:1 }}>Plus tard</button>
      <button className="btn fill" style={{ flex:2 }}>Étape suivante →</button>
    </div>

    <Anno x={10} y={155} w={120} dir="right" rot={-4}>stepper clair,<br />pas d&apos;ambigüité</Anno>
  </Phone>
);

// === 3B — Preuve de livraison (tout sur un écran)
const DriverPOD_B = () => (
  <Phone>
    <div className="flex ai-c gap-6">
      <span className="kbd">←</span>
      <span className="script fs-22">Valider la livraison</span>
    </div>
    <small className="mono">Course #04 · Mme Lefèvre</small>

    <div className="flex gap-8">
      <Box className="solid" style={{ flex:1, padding:6 }}>
        <ImgPh w="100%" h={80} label="📸 photo" />
        <div className="flex jc-sb ai-c mt-4">
          <small className="mono">Photo colis</small>
          <Pill kind="good">✓</Pill>
        </div>
      </Box>
      <Box style={{ flex:1, padding:6 }}>
        <ImgPh w="100%" h={80} label="🔳 scan" />
        <div className="flex jc-sb ai-c mt-4">
          <small className="mono">Code-barres</small>
          <Pill kind="good">✓</Pill>
        </div>
      </Box>
    </div>

    <Box>
      <small className="mono">SIGNATURE</small>
      <Signature h={90} />
      <div className="flex jc-sb mt-4">
        <small className="mono">Karim · auj. 11:42</small>
        <button className="btn" style={{ padding:"2px 8px", fontSize:11 }}>Effacer</button>
      </div>
    </Box>

    <Box>
      <small className="mono">REMARQUES (optionnel)</small>
      <div className="inp" style={{ minHeight: 28 }}>Laissé à la voisine (porte 4B)</div>
    </Box>

    <button className="btn good block" style={{ marginTop:"auto" }}>✓ Confirmer la livraison</button>
    <DriverTabBar active={0} />

    <Stamp x={200} y={6} rot={6}>POD v2</Stamp>
  </Phone>
);

// === 4A — Historique & gains (calendrier + total)
const DriverHistory_A = () => (
  <Phone>
    <div className="flex jc-sb ai-c">
      <span className="script fs-22">Historique & gains</span>
      <Pill>Mai</Pill>
    </div>

    <Box className="dark" style={{ borderRadius:12 }}>
      <small className="mono" style={{ color:"#fff7d6", opacity:.7 }}>GAINS DU MOIS</small>
      <div className="script" style={{ fontSize:38, lineHeight:1 }}>2 348 €</div>
      <div className="flex jc-sb mt-4">
        <span className="mono fs-11" style={{ opacity:.85 }}>184 courses</span>
        <span className="mono fs-11" style={{ opacity:.85 }}>+12% vs avr.</span>
      </div>
    </Box>

    <div className="mono fs-10 muted" style={{ marginTop: 2 }}>SEMAINE</div>
    <BarChart height={110} data={[
      { l:"L", v: 38 }, { l:"M", v: 52 }, { l:"M", v: 41 },
      { l:"J", v: 64 }, { l:"V", v: 78, color:"var(--accent)" },
      { l:"S", v: 22 }, { l:"D", v: 0 },
    ]}/>

    <div className="mono fs-10 muted">DERNIÈRES COURSES</div>
    <Row lead="✓" title="J. Bocuse — 7e" sub="auj. 10:42 · 14 €" end={<Pill kind="good">livré</Pill>}/>
    <Row lead="✓" title="Maison Pradier" sub="auj. 09:58 · 9 €" end={<Pill kind="good">livré</Pill>}/>
    <Row lead="!" title="A. Durand" sub="hier · incident — 3 €" end={<Pill kind="bad">retour</Pill>}/>

    <DriverTabBar active={2} />
  </Phone>
);

// === 4B — Historique & gains (timeline)
const DriverHistory_B = () => (
  <Phone>
    <div className="flex jc-sb ai-c">
      <span className="script fs-22">Mes courses</span>
      <div className="flex gap-4">
        <Pill>Sem.</Pill><Pill kind="">Mois</Pill><Pill>Tout</Pill>
      </div>
    </div>
    <div className="flex gap-6">
      <KPI label="COURSES" value="184" delta="+12%" kind="good"/>
      <KPI label="€ NETS" value="2 348" delta="moy. 12,7€/c."/>
    </div>

    <div className="mono fs-10 muted">VEN. 17 MAI</div>
    <div style={{ borderLeft:"2px dashed var(--ink)", paddingLeft:10, marginLeft:6 }}>
      <Row lead="08" title="Pharma Bastille" sub="11:42 · 4.1 km · 12,50 €" end="✓"/>
      <Row lead="07" title="Le Petit Marché" sub="10:58 · 2.3 km · 9,00 €" end="✓"/>
      <Row lead="06" title="A. Durand" sub="09:30 · refus client — retour" end={<Pill kind="bad">!</Pill>}/>
    </div>
    <div className="mono fs-10 muted">JEU. 16 MAI</div>
    <div style={{ borderLeft:"2px dashed var(--ink)", paddingLeft:10, marginLeft:6 }}>
      <Row lead="11" title="Hub Nation" sub="17:02 · clôture journée" end="—"/>
      <Row lead="10" title="J. Mercier" sub="16:14 · 3.0 km · 11,00 €" end="✓"/>
    </div>

    <DriverTabBar active={2} />
    <Anno x={6} y={150} w={120} dir="right" rot={-3}>vue<br/>chronologique</Anno>
  </Phone>
);

// === 5A — Notifications & messages dispatcher (inbox)
const DriverInbox_A = () => (
  <Phone>
    <div className="flex jc-sb ai-c">
      <span className="script fs-22">Boîte de réception</span>
      <Pill kind="warn">3 nouv.</Pill>
    </div>
    <div className="flex gap-6">
      <Pill kind="warn">Tout</Pill><Pill>Dispatcher</Pill><Pill>Système</Pill>
    </div>

    <Row lead="!" title="Mission ré-attribuée" sub="dispatch · il y a 2 min · #07 → vous" end={<Pill kind="warn">!</Pill>}/>
    <Row lead="L" title="Léa (Dispatch)" sub="“Tu peux passer chez Pharma…”" end="3m"/>
    <Row lead="i" title="Bonus week-end activé" sub="système · +0,80 € / course" end="1h"/>
    <Row lead="L" title="Léa (Dispatch)" sub="“Pause de 30 min validée”" end="hier"/>
    <Row lead="✓" title="POD #03 validé" sub="système · paiement traité" end="hier"/>
    <Row lead="i" title="Mise à jour app v2.4" sub="système · nouveautés POD" end="lun."/>

    <button className="btn block" style={{ marginTop:"auto" }}>✎ Nouveau message au dispatch</button>
    <DriverTabBar active={3} />
  </Phone>
);

// === 5B — Notifications & messages (chat conversation)
const DriverInbox_B = () => (
  <Phone>
    <div className="flex ai-c gap-6">
      <span className="kbd">←</span>
      <div className="lead" style={{
        width:32, height:32, border:"1.4px solid var(--ink)",
        borderRadius:99, display:"flex", alignItems:"center", justifyContent:"center",
        background:"#fff5d6", fontFamily:"var(--font-script)", fontWeight:700
      }}>L</div>
      <div>
        <div className="script fs-18" style={{ lineHeight:1 }}>Léa · Dispatch</div>
        <small className="mono">en ligne · répond en ~2 min</small>
      </div>
    </div>

    <div className="mono fs-10 tac muted">— auj. 11:18 —</div>
    <div style={{
      alignSelf:"flex-start", maxWidth:"82%",
      border:"1.5px dashed var(--ink)", borderRadius:"14px 14px 14px 4px",
      padding:"6px 10px", background:"#fff5d6", fontSize:13,
    }}>Salut Karim ! Tu peux prendre la livraison #07 ? Le client a appelé.</div>
    <div style={{
      alignSelf:"flex-end", maxWidth:"82%",
      border:"1.6px solid var(--ink)", borderRadius:"14px 14px 4px 14px",
      padding:"6px 10px", background:"var(--ink)", color:"#fff7d6", fontSize:13,
    }}>Ok, je termine la #04 et j&apos;y vais 👍</div>
    <div style={{
      alignSelf:"flex-start", maxWidth:"82%",
      border:"1.5px dashed var(--ink)", borderRadius:"14px 14px 14px 4px",
      padding:"6px 10px", background:"#fff5d6", fontSize:13,
    }}>Top, je te l&apos;ajoute. <span className="u">Délai max 12h45.</span></div>

    <Box className="solid" style={{ padding:"6px 8px" }}>
      <div className="flex ai-c gap-6">
        <span className="mono fs-11" style={{ opacity:.6 }}>📎</span>
        <div className="inp" style={{ borderBottom:0, fontSize:13 }}>Tape ton message…</div>
        <span className="kbd">⏎</span>
      </div>
    </Box>

    <DriverTabBar active={3} />
    <Anno x={150} y={350} w={130} dir="left" rot={-4}>chat 1:1<br/>+ pièces jointes</Anno>
  </Phone>
);

window.DriverApp = function DriverApp() {
  return (
    <div>
      <div className="tab-intro">
        <h1><span className="hl">Mobile</span><br/>Driver</h1>
        <div>
          <p>App chauffeur (React Native). L&apos;outil de terrain : recevoir sa tournée, naviguer, prouver les livraisons et toucher ses gains. Optimisée pour le pouce, l&apos;extérieur et les gants.</p>
          <span className="meta">apps/mobile-driver · iOS + Android · 360 × 760 dp</span>
        </div>
      </div>

      <Section n="1" title="Liste des courses du jour" desc="L&apos;écran d&apos;atterrissage après le login." />
      <VarRow>
        <Variation label="Variation A — Chronologique" badge="liste" note="Tournée en cartes verticales, ‘Maintenant / Ensuite’. Familier, sûr.">
          <DriverList_A/>
        </Variation>
        <Variation label="Variation B — Carte d&apos;abord" badge="map-first" note="La carte domine, bottom-sheet sur le stop courant. Plus orienté terrain.">
          <DriverList_B/>
        </Variation>
      </VarRow>

      <Section n="2" title="Détail de course + navigation" desc="Tout ce qu&apos;il faut pour livrer un colis." />
      <VarRow>
        <Variation label="A — Action-first" badge="détail" note="Infos en haut, gros bouton ‘Naviguer’ + ‘Livré’. Idéal en intérieur.">
          <DriverDetail_A/>
        </Variation>
        <Variation label="B — Navigation plein écran" badge="immersif" note="Map en plein écran, instructions tour-par-tour. Idéal en conduite.">
          <DriverDetail_B/>
        </Variation>
      </VarRow>

      <Section n="3" title="Preuve de livraison (POD)" desc="Photo, scan, signature, remarques." />
      <VarRow>
        <Variation label="A — Stepper" badge="guidé" note="Étapes obligatoires séparées (Scan → Photo → Signer). Réduit les oublis.">
          <DriverPOD_A/>
        </Variation>
        <Variation label="B — Tout-en-un" badge="rapide" note="Photo + scan + signature sur un seul écran. Pour livreurs expérimentés.">
          <DriverPOD_B/>
        </Variation>
      </VarRow>

      <Section n="4" title="Historique & gains" desc="Combien j&apos;ai gagné, et quelles courses." />
      <VarRow>
        <Variation label="A — Synthèse + barre" badge="résumé" note="Gros chiffre du mois, semaine en barres, derniers items.">
          <DriverHistory_A/>
        </Variation>
        <Variation label="B — Timeline" badge="détaillé" note="Par jour, chronologique, plus proche d&apos;un journal de bord.">
          <DriverHistory_B/>
        </Variation>
      </VarRow>

      <Section n="5" title="Notifications & messages dispatcher" desc="Garder le lien avec le hub, sans surcharger." />
      <VarRow>
        <Variation label="A — Inbox unifiée" badge="liste" note="Système + dispatch + opérations dans une seule boîte, filtrée par onglets.">
          <DriverInbox_A/>
        </Variation>
        <Variation label="B — Chat 1:1" badge="conversation" note="Conversation directe avec son dispatcher. Pièces jointes, statuts de lecture.">
          <DriverInbox_B/>
        </Variation>
      </VarRow>
    </div>
  );
};
