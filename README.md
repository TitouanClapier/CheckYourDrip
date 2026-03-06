# CheckYourDrip — Documentation Technique

## Vue d'ensemble

Système de détection de tenues vestimentaires en temps réel via webcam, basé sur un modèle YOLO entraîné sur mesure. Les détections validées manuellement sont enregistrées dans deux bases de données (PostgreSQL et MongoDB) avec capture photo uploadée sur Cloudinary.

---

## Architecture

```
Webcam
  └─► YOLO (détection)
        └─► [bouton ENVOYER — validation manuelle]
              ├─► PostgreSQL (Supabase)   — log structuré
              ├─► Cloudinary              — stockage photo
              └─► MongoDB (Atlas)         — log enrichi avec URL photo
```

---

## Stack technique

| Composant       | Technologie              | Hébergement       |
|-----------------|--------------------------|-------------------|
| Détection IA    | YOLOv8 / Ultralytics     | Local (CPU/GPU)   |
| Vision webcam   | OpenCV                   | Local             |
| Base relationnelle | PostgreSQL            | Supabase (free)   |
| Base documents  | MongoDB                  | Atlas (free)      |
| Stockage images | Cloudinary               | Cloudinary (free) |
| Runtime         | Python 3.9               | Local             |

---

## Prérequis

- Python 3.9+
- Webcam fonctionnelle
- Comptes : [Supabase](https://supabase.com), [MongoDB Atlas](https://www.mongodb.com/atlas), [Cloudinary](https://cloudinary.com)

---

## Installation

```bash
# Cloner le projet
git clone <repo>
cd projet-ia

# Créer et activer l'environnement virtuel
python3 -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

# Installer les dépendances
pip install ultralytics opencv-python psycopg2-binary pymongo cloudinary python-dotenv
```

---

## Configuration

Créer un fichier `.env` à la racine :

```env
# PostgreSQL (Supabase) — Settings → Database → Connection string → Session mode
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-X-XX-XXXX-X.pooler.supabase.com:5432/postgres

# MongoDB Atlas — Connect → Drivers → URI
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=<app>
MONGO_DB=db-CheckYourDrip

# Cloudinary — Dashboard → API Keys
CLOUDINARY_CLOUD_NAME=<cloud_name>
CLOUDINARY_API_KEY=<api_key>
CLOUDINARY_API_SECRET=<api_secret>
```

> **Important :** Ne jamais commiter le fichier `.env`. Ajouter `.env` au `.gitignore`.

---

## Initialisation de la base PostgreSQL

```bash
python3 scripts/init_db.py
```

Crée la table `detections` sur Supabase :

```sql
CREATE TABLE detections (
    id           SERIAL PRIMARY KEY,
    detected_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    object_class VARCHAR(100) NOT NULL,
    confidence   FLOAT NOT NULL,
    seen         BOOLEAN NOT NULL DEFAULT FALSE
);
```

Le champ `seen` permet de marquer les détections comme lues depuis une interface d'administration.

---

## Vérification des connexions

```bash
python3 scripts/test_connections.py
```

Sortie attendue :
```
========================================
[ PostgreSQL ] Connexion... OK
[ MongoDB    ] Connexion... OK
[ Cloudinary ] Connexion... OK
========================================
```

---

## Lancement de la détection

```bash
python3 scripts/webcam.py
```

### Comportement

1. Le flux webcam s'ouvre avec détection YOLO en temps réel
2. Dès qu'un vêtement est détecté, un bouton **ENVOYER** (vert) apparaît avec le nom de la classe et le score de confiance
3. Un clic sur le bouton déclenche l'enregistrement en arrière-plan :
   - Insert dans **PostgreSQL** → `detections`
   - Upload du frame en JPEG sur **Cloudinary** → dossier `checkyourdrip/detections/`
   - Insert dans **MongoDB** → collection `Logs`
4. Le bouton passe en **Envoi...** (jaune) pendant la sauvegarde
5. Appuyer sur `q` pour quitter

### Contrôles

| Action          | Commande              |
|-----------------|-----------------------|
| Valider détection | Clic sur ENVOYER    |
| Quitter          | Touche `q`           |

---

## Modèle YOLO

- **Chemin :** `runs/detect/models/trained/final_model2/weights/best.pt`
- **Seuil de confiance :** 0.3 (configurable dans `webcam.py`)
- **32 classes détectées :**

| ID | Classe         | ID | Classe        |
|----|----------------|----|---------------|
| 0  | headwear       | 16 | White Sandal  |
| 1  | fashion_item   | 17 | YellowSandal  |
| 2  | Adidas         | 18 | head          |
| 3  | cotton         | 19 | jacket        |
| 4  | denim          | 20 | pants         |
| 5  | shorts         | 21 | shirt         |
| 6  | slacks         | 22 | skirt         |
| 7  | sweats         | 23 | t-shirt       |
| 8  | Black Sandal   | 24 | hata          |
| 9  | Blue Sandal    | 25 | person        |
| 10 | Brown Sandal   | 26 | longonepiece  |
| 11 | Green Sandal   | 27 | longskirt     |
| 12 | OrangeSandal   | 28 | midionepiece  |
| 13 | Pink Sandal    | 29 | midiskirt     |
| 14 | Red Sandal     | 30 | minionepiece  |
| 15 | Sandal         | 31 | miniskirt     |

> Les classes 0 et 1 ont été exportées sans nom depuis Roboflow et sont renommées via `CLASS_NAME_OVERRIDE` dans `webcam.py`.

---

## Schéma des données

### PostgreSQL — table `detections`

```
id           : SERIAL PK       — identifiant auto-incrémenté
detected_at  : TIMESTAMPTZ     — horodatage UTC de la détection
object_class : VARCHAR(100)    — nom de la classe détectée
confidence   : FLOAT           — score de confiance (0.0 → 1.0)
seen         : BOOLEAN         — lu par un admin (défaut: false)
```

### MongoDB — collection `Logs`

```json
{
  "_id":          ObjectId,
  "objectId":     ObjectId,
  "dateLog":      ISODate,
  "photo":        "https://res.cloudinary.com/...",
  "verification": false,
  "objectClass":  "t-shirt",
  "pgDetectionId": 42
}
```

---

## Scripts utilitaires

| Script                        | Description                                      |
|-------------------------------|--------------------------------------------------|
| `scripts/webcam.py`           | Détection temps réel + sauvegarde BDD            |
| `scripts/init_db.py`          | Création des tables PostgreSQL sur Supabase      |
| `scripts/test_connections.py` | Vérification des 3 connexions (PG, Mongo, Cloud) |
| `scripts/cloudinary_delete.py`| Suppression d'images Cloudinary                  |

### Supprimer des images Cloudinary

```bash
# Supprimer tout le dossier (avec confirmation)
python3 scripts/cloudinary_delete.py

# Supprimer une image précise par son public_id
python3 scripts/cloudinary_delete.py checkyourdrip/detections/abc123
```

---

## Structure du projet

```
projet-ia/
├── .env                          # Variables d'environnement (non commité)
├── README.md                     # Ce fichier
├── data/
│   ├── dataset_final.yaml        # Config dataset d'entraînement
│   └── raw/                      # Datasets bruts Roboflow
├── runs/
│   └── detect/models/trained/
│       └── final_model2/
│           └── weights/
│               └── best.pt       # Modèle entraîné
├── scripts/
│   ├── webcam.py                 # Script principal
│   ├── init_db.py                # Init PostgreSQL
│   ├── test_connections.py       # Test connexions
│   ├── cloudinary_delete.py      # Nettoyage Cloudinary
│   ├── train_final.py            # Entraînement du modèle
│   └── ...
└── venv/                         # Environnement virtuel Python
```

---

## Notes

- **Supabase free tier :** le projet se met en pause après 1 semaine d'inactivité. Le relancer depuis le dashboard si la connexion échoue. Utiliser l'URL du **Connection Pooler (Session mode, port 5432)** et non la connexion directe.
- **Thread d'envoi :** la sauvegarde est asynchrone pour ne pas bloquer le flux vidéo. Le bouton reste en "Envoi..." jusqu'à la fin des 3 opérations (PG + Cloudinary + MongoDB).
- **Python 3.9 :** la syntaxe `dict | None` n'est pas supportée, utiliser `None` sans annotation de type.
