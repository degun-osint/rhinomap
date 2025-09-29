# 🦏 RhinoMapToolbox

Une application JavaScript locale pour la cartographie et les mesures géographiques.

*Réalisé avec ❤️ par Degun @ oscarzulu*

## 🌟 Fonctionnalités

- **🗺️ Cartes multiples** : Vue OpenStreetMap et vue satellite
- **📍 Placement de points** : Ajout de points d'intérêt sur la carte
- **📏 Tracé de traits** : Mesure de distance et d'azimut en temps réel
- **⭕ Cercles de mesure** : Création de zones circulaires avec calcul de superficie
- **🔺 Triangulation** : Calcul de triangles avec aires et périmètres
- **💾 Export/Import** : Sauvegarde et chargement des tracés en format JSON
- **📱 Interface moderne** : Design responsive avec icônes Iconoir

## 🚀 Utilisation

1. Ouvrez `index.html` dans votre navigateur
2. Sélectionnez un outil dans la barre d'outils
3. Cliquez sur la carte pour utiliser l'outil sélectionné

### Outils disponibles

#### 📍 Points
- Cliquez sur la carte pour placer un point
- Les coordonnées sont affichées dans une popup

#### 📏 Traits
- Premier clic : point de départ
- Déplacement : aperçu en temps réel avec distance et azimut
- Deuxième clic : point d'arrivée et finalisation

#### ⭕ Cercles
- Premier clic : centre du cercle
- Déplacement : ajustement du rayon
- Deuxième clic : finalisation avec calcul de superficie

#### 🔺 Triangles
- Cliquez sur 3 points pour former un triangle
- Calcul automatique des côtés, aire et périmètre

### Contrôles

- **Échap** : Annuler l'action en cours
- **Effacer** : Supprimer tous les éléments
- **Carte/Satellite** : Changer de vue
- **Import/Export** : Sauvegarder/charger les tracés

## 🛠️ Structure du projet

```
rhinomap/
├── index.html      # Structure HTML principale
├── style.css       # Styles et mise en forme
├── app.js         # Logique JavaScript
└── README.md      # Documentation
```

## 📦 Dépendances

- **Leaflet** : Bibliothèque de cartographie (CDN)
- **Iconoir** : Icônes modernes (CDN)
- **OpenStreetMap** : Tiles de carte
- **ArcGIS** : Tiles satellite

## 🎯 Fonctionnalités techniques

### Calculs géographiques
- Distance orthodromique (great circle)
- Calcul d'azimut vrai
- Aires géométriques
- Coordonnées géographiques précises

### Interface utilisateur
- Interface responsive
- Tooltips informatifs en temps réel
- Feedback visuel pour toutes les actions
- Gestion des états d'outils

### Persistance des données
- Export JSON structuré avec métadonnées
- Import avec restauration complète
- Format de données versionné

## 🌐 Utilisation locale

Cette application fonctionne entièrement côté client :
- Pas de serveur requis
- Données stockées localement
- Fonctionne hors ligne (après premier chargement)

## 📋 Format d'export

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0",
  "data": {
    "points": [...],
    "lines": [...],
    "circles": [...],
    "triangles": [...]
  }
}
```

## 🎨 Personnalisation

### Couleurs des outils
- Points : Markers Leaflet par défaut
- Traits : Rouge (`#e74c3c`)
- Cercles : Orange (`#f39c12`)
- Triangles : Violet (`#9b59b6`)

### Interface
- Thème sombre par défaut
- Design moderne avec glassmorphism
- Animations fluides

## 📱 Compatibilité

- Navigateurs modernes (Chrome, Firefox, Safari, Edge)
- Support mobile et desktop
- Interface responsive

## 🤝 Contribution

Développé par Degun @ oscarzulu
Suggestions et améliorations bienvenues !