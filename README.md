# 🦏 RhinoMapToolbox

Une application JavaScript locale complète pour la cartographie et les mesures géographiques avec outils avancés.

## 🌟 Fonctionnalités

- **🗺️ Cartes multiples** : Vue OpenStreetMap et vue satellite
- **📍 Points nommés** : Placement et nommage de points d'intérêt avec labels persistants
- **📏 Tracé mesuré** : Lignes multi-segments avec mesures en temps réel et système de contraintes
- **⚙️ Contraintes de tracé** : Verrouillage de distance et d'azimut pour un tracé précis
- **⭕ Zones circulaires** : Création de cercles avec calcul de superficie en temps réel
- **🔺 Aires de polygones** : Calcul d'aires de polygones complexes
- **⏱️ Isochrones** : Calcul d'isochrones et isodistances avec l'API IGN Géoplateforme
- **🔍 Recherche géographique** : Recherche d'adresses et lieux via Nominatim
- **💾 Export/Import** : Sauvegarde complète en format JSON
- **📱 Interface moderne** : Design responsive avec glassmorphism et icônes Iconoir

## 🚀 Utilisation

1. Ouvrez `index.html` dans votre navigateur
2. Sélectionnez un outil dans la barre d'outils
3. Cliquez sur la carte pour utiliser l'outil sélectionné

### Outils disponibles

#### 📍 Points nommés
- Cliquez sur la carte pour placer un point
- Nommez le point dans la boîte de dialogue
- Cliquez sur le nom pour le renommer
- Labels persistants toujours visibles

#### 📏 Tracé mesuré
- Cliquez pour commencer un tracé multi-segments
- Chaque segment affiche distance et azimut en temps réel
- **Clic droit** ou **Ctrl+clic** pour terminer le tracé
- **Échap** pour annuler

#### ⚙️ Contraintes de tracé
- Verrouillez la distance pour tracer des segments de longueur fixe
- Verrouillez l'azimut pour tracer dans une direction précise
- Panneau de contraintes avec statistiques en temps réel

#### ⭕ Zones circulaires
- Premier clic : centre du cercle
- Déplacement : ajustement du rayon avec superficie en temps réel
- Deuxième clic : finalisation

#### 🔺 Aires de polygones
- Cliquez pour créer les sommets du polygone
- **Clic droit** ou **Ctrl+clic** pour fermer le polygone
- Calcul automatique de l'aire

#### ⏱️ Isochrones
- Cliquez sur la carte pour placer le point de départ
- Configurez le mode de transport (voiture/piéton)
- Choisissez isochrone (temps) ou isodistance
- Définissez les contraintes (éviter péages, tunnels, ponts)
- Le point de départ reste visible après calcul
- ⚠️ **Limitation géographique** : Fonctionne uniquement en France métropolitaine et DOM-TOM

#### 🔍 Recherche
- Tapez une adresse ou un lieu dans la barre de recherche
- Sélectionnez un résultat pour centrer la carte
- Intégration avec l'API Nominatim

### Contrôles

- **Échap** : Annuler l'action en cours
- **Clic droit / Ctrl+clic** : Terminer un tracé multi-segments
- **Effacer tout** : Supprimer tous les éléments
- **Carte/Satellite** : Changer de vue
- **Import/Export** : Sauvegarder/charger les tracés

## 🛠️ Structure du projet

```
rhinomap/
├── index.html      # Structure HTML principale
├── style.css       # Styles et mise en forme
├── app.js         # Logique JavaScript complète
├── README.md      # Documentation
└── isochrone/     # Documentation API isochrones
    ├── itineraire.yaml
    └── response.json
```

## 📦 Dépendances

- **Leaflet 1.9.4** : Bibliothèque de cartographie (CDN)
- **Iconoir** : Icônes modernes (CDN)
- **OpenStreetMap** : Tiles de carte
- **ArcGIS** : Tiles satellite
- **Nominatim** : API de géocodage pour la recherche
- **IGN Géoplateforme** : API pour les isochrones

## 🎯 Fonctionnalités techniques

### Calculs géographiques
- Distance orthodromique (great circle) avec formule de Haversine
- Calcul d'azimut vrai avec gestion des quadrants
- Aires géométriques avec formule de Shoelace
- Coordonnées géographiques haute précision
- Conversions d'unités (mètres, kilomètres, minutes, secondes)

### Système de contraintes
- Verrouillage de distance avec validation en temps réel
- Verrouillage d'azimut avec snap automatique
- Feedback visuel et statistiques de tracé
- Réinitialisation et gestion des états

### Interface utilisateur avancée
- Panneaux coulissants non-bloquants
- Tooltips informatifs en temps réel avec throttling
- Feedback visuel pour toutes les actions
- Gestion des états d'outils avec persistence
- Modales contextuelles pour la saisie
- Design responsive avec breakpoints mobiles

### Persistance et export
- Export JSON structuré avec métadonnées complètes
- Import avec restauration de tous les éléments
- Format de données versionné et extensible
- Gestion des erreurs et validation

### Performance
- Throttling des événements mousemove (50ms)
- Optimisation des calculs géométriques
- Mise en cache des résultats de recherche
- Gestion mémoire avec nettoyage automatique

## 🌐 APIs intégrées

### Nominatim (Recherche)
- Géocodage d'adresses et lieux
- Résultats formatés avec détails
- Gestion des erreurs réseau
- Cache des recherches récentes

### IGN Géoplateforme (Isochrones)
- Calcul d'isochrones et isodistances
- Support voiture et piéton
- Contraintes de routage (péages, tunnels, ponts)
- Formats de sortie GeoJSON
- Gestion des directions (depuis/vers)
- **Zone de couverture** : France métropolitaine et DOM-TOM uniquement
- **Coordonnées supportées** : Longitude entre -21.42 et 51.27, Latitude selon les territoires français

## 📋 Format d'export

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "2.0",
  "data": {
    "points": [{
      "id": "point_123",
      "name": "Point d'intérêt",
      "coordinates": [45.7640, 4.8357],
      "timestamp": "2024-01-01T12:00:00.000Z"
    }],
    "lines": [{
      "id": "line_456",
      "segments": [...],
      "totalDistance": 1500.25,
      "coordinates": [...]
    }],
    "circles": [...],
    "polygons": [...],
    "isochrones": [...]
  }
}
```

## 🎨 Thème et personnalisation

### Palette de couleurs
- **Points** : Rouge (#e74c3c) avec icônes personnalisées
- **Lignes** : Bleu (#3498db) avec labels persistants
- **Cercles** : Orange (#f39c12) avec aires dynamiques
- **Polygones** : Violet (#9b59b6) avec calculs temps réel
- **Isochrones** : Bleu clair (#3388ff) avec transparence

### Design system
- Thème sombre avec glassmorphism
- Gradients et ombres subtiles
- Animations fluides (transition 0.2s)
- Typographie système moderne
- Interface responsive avec breakpoints

## 📱 Compatibilité

- **Navigateurs** : Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile** : Interface tactile optimisée
- **Desktop** : Support clavier complet
- **Offline** : Fonctionne après premier chargement (cartes en cache)

## 🔗 Liens

- **GitHub** : [https://github.com/degun-osint/rhinomap](https://github.com/degun-osint/rhinomap)
- **Support** : [https://ko-fi.com/D1D11CYJEY](https://ko-fi.com/D1D11CYJEY)

## 📄 Licence

Ce projet est distribué sous la licence **GNU General Public License v3.0 (GPLv3)**.

### Résumé de la licence GPLv3

- ✅ **Usage commercial** : Autorisé
- ✅ **Modification** : Autorisée
- ✅ **Distribution** : Autorisée
- ✅ **Usage privé** : Autorisé
- ✅ **Brevet** : Protection accordée

- ⚠️ **Copyleft** : Les œuvres dérivées doivent être sous la même licence
- ⚠️ **Code source** : Doit être fourni avec les distributions
- ⚠️ **Notice de licence** : Doit être incluse dans les copies
- ⚠️ **Changements d'état** : Les modifications doivent être documentées

### Texte complet de la licence

Voir le fichier [LICENSE](./LICENSE) pour le texte complet de la licence GPLv3.

Copyright (C) 2024 Degun @ oscarzulu

## 🤝 Contribution

Développé avec ❤️ par **Degun @ oscarzulu**

### Comment contribuer
1. Fork le projet
2. Créez une branche pour votre fonctionnalité
3. Commitez vos changements
4. Poussez vers la branche
5. Ouvrez une Pull Request

### Développement local
```bash
# Cloner le repository
git clone https://github.com/degun-osint/rhinomap.git

# Ouvrir dans un navigateur
open index.html
```

Suggestions, améliorations et rapports de bugs bienvenus !

---

*RhinoMapToolbox - Outil de cartographie et mesure géographique libre et open source*