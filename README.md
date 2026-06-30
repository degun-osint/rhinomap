# 🦏 RhinoMap Toolbox

**Boîte à outils de cartographie et de mesures géographiques — 100 % locale, sans serveur ni compte.**

RhinoMap Toolbox est la partie cartographie de [RhinoMap](https://rhinomap.com)
(service fermé en 2026), désormais publiée en version autonome et open-source.
Tout tourne dans le navigateur : aucune donnée n'est envoyée nulle part, tes
créations sont conservées en `localStorage`.

👉 **Version hébergée :** https://rhinomap.com/map/

## ✨ Fonctionnalités

- **🗺️ Fonds de carte** — OpenStreetMap, vue satellite, relief.
- **📍 Points nommés** — placement avec icônes (215 pictos), labels persistants.
- **📏 Tracé mesuré** — lignes multi-segments avec distance et azimut en temps
  réel, et **contraintes** (verrouillage de distance / d'azimut) pour un tracé précis.
- **⭕ Cercles** — rayon et superficie calculés en direct.
- **🔺 Polygones** — calcul d'aire.
- **⏱️ Isochrones / isodistances** — via l'API publique IGN Géoplateforme
  (voiture / piéton, durée ou distance, options péages/tunnels/ponts).
- **🧅 Calques** — organisation des éléments en couches (afficher/masquer, couleurs).
- **🔍 Recherche géographique** — adresses et lieux via Nominatim (OSM).
- **💾 Import / Export** — JSON (format RhinoMap), GeoJSON, CSV, KML, et export
  **image PNG** de la carte (avec légende).

## 🚀 Utilisation

Aucune installation, aucune dépendance à builder.

```bash
# Soit ouvrir directement le fichier :
open index.html

# Soit le servir en statique (recommandé) :
python3 -m http.server 8000
# puis http://localhost:8000
```

1. Choisis un outil dans la barre latérale gauche.
2. Clique sur la carte pour l'utiliser.
3. Organise tes éléments en calques (panneau de droite).
4. Exporte via le menu **Fichiers**.

Les requêtes Overpass (OSM) se génèrent à côté avec le skill RhinoMap pour LLM,
puis se lancent sur [Overpass Turbo](https://overpass-turbo.eu/).

## 🧱 Stack

Statique, sans build : MapLibre GL JS, Supercluster (clustering),
@tmcw/togeojson (import KML/GPX), html2canvas (export image), icônes Iconoir.
Toutes les libs sont chargées via CDN.

## 🔒 Vie privée

Pas de backend, pas de compte, pas de tracker. Les seuls appels réseau sortants
sont les tuiles de carte, la recherche Nominatim et le calcul d'isochrone IGN —
tous des services publics, appelés directement par ton navigateur.

## 📄 Licence

GPL-3.0 — voir [LICENSE](LICENSE).

---

Réalisé avec ❤️ par **Degun** — [La Manufacture Française d'OSINT](https://osintisnotacrime.com).
Un café ? [ko-fi.com/oscarzulu](https://ko-fi.com/D1D11CYJEY)
