# Wireframes — Transvirex Logistics

Kit de **wireframes basse-fidélité** (design handoff) pour la plateforme logistique
Transvirex. Importé depuis Claude Design et implémenté sous `index.html`.

Style « papier / esquisse » volontairement neutre (pas de couleurs de marque) pour
cadrer la **structure** et les **flux** avant le hi-fi. Chaque écran clé est exploré en
**2 variations**.

## Contenu

| Fichier | Rôle |
|---|---|
| `index.html` | Point d'entrée — charge React + Babel (CDN) et les fichiers ci-dessous |
| `wireframe.css` | Styles (frames téléphone/navigateur, primitives esquissées, charts) |
| `wireframe-kit.jsx` | Composants réutilisables (Phone, Win, Side, MapView, BarChart, KPI…) |
| `tweaks-panel.jsx` | Panneau de réglages flottant (densité, tracé, annotations) |
| `main.jsx` | Coquille : barre d'onglets, vue d'ensemble, montage React |
| `app-driver.jsx` | App mobile Chauffeur — 5 écrans × 2 variations |
| `app-dispatcher.jsx` | App web Dispatcher — 5 écrans × 2 variations |
| `app-dashboard.jsx` | App web Dashboard / KPI — 4 écrans × 2 variations |
| `app-admin.jsx` | App web Admin — 3 écrans × 2 variations |

**4 applications · 17 écrans clés · 34 variations.**

## Lancer

Les fichiers `.jsx` sont chargés via `<script src>` puis transpilés par Babel dans le
navigateur : il faut donc servir le dossier en **HTTP** (l'ouverture directe en
`file://` est bloquée par la politique CORS).

```bash
# au choix, depuis ce dossier :
npx serve .            # puis ouvrir l'URL affichée
# — ou —
python -m http.server 8080   # puis http://localhost:8080
```

> Astuce : le panneau « Tweaks » (coin inférieur droit, si activé par l'hôte) permet de
> basculer densité, tracé esquissé/net et annotations.
