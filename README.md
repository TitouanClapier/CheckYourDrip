# Dress Code Detection System

Système de détection automatique de tenues vestimentaires inappropriées en temps réel, basé sur **YOLOv11** et une interface de notification web.

---

## Sommaire

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture du projet](#architecture-du-projet)
3. [Classes détectées](#classes-détectées)
4. [Datasets](#datasets)
5. [Installation](#installation)
6. [Pipeline complète](#pipeline-complète)
7. [Entraînement du modèle](#entraînement-du-modèle)
8. [Résultats et métriques](#résultats-et-métriques)
9. [Lancer le système](#lancer-le-système)
10. [Améliorer le modèle](#améliorer-le-modèle)
11. [Application web](#application-web)

---

## Vue d'ensemble

Le système analyse un flux webcam en temps réel et détecte les vêtements non conformes à un code vestimentaire. Lorsqu'une infraction est détectée, les données sont envoyées automatiquement (cooldown 3s) vers trois services cloud, et une notification est diffusée au dashboard web local.

```
Webcam → Détection YOLO → [violation détectée]
                                ├─► Cloudinary              — photo annotée
                                ├─► MongoDB Atlas (Logs)    — log enrichi
                                ├─► Supabase (detections)   — log structuré
                                └─► Serveur FastAPI         — dashboard web temps réel
```

---

## Architecture du projet

```
projet_ia/
├── config.py                    ← Classes, couleurs, paramètres globaux
├── main.py                      ← Point d'entrée (lance tout)
├── requirements.txt
│
├── data/
│   ├── class_mapping.py         ← Mapping classes brutes → classes cibles
│   ├── download_datasets.py     ← Téléchargement des datasets Roboflow
│   └── merge_datasets.py        ← Fusion, équilibrage et split train/val/test
│
├── training/
│   ├── train.py                 ← Entraînement / validation / export YOLO
│   ├── dataset.yaml             ← Config dataset pour YOLO (généré automatiquement)
│   └── runs/
│       └── dress_code_detector/
│           ├── weights/
│           │   ├── best.pt      ← Meilleur modèle sauvegardé
│           │   └── last.pt      ← Dernier checkpoint
│           ├── results.png      ← Courbes d'entraînement
│           ├── confusion_matrix_normalized.png
│           ├── BoxPR_curve.png
│           └── ...
│
├── detection/
│   ├── detector.py              ← Classe ClothingDetector (wrapper YOLO)
│   └── webcam_app.py            ← Application webcam avec UI OpenCV
│
└── server/
    ├── app.py                   ← Serveur FastAPI (WebSocket + API REST)
    └── dashboard/
        └── index.html           ← Dashboard de notifications en temps réel
```

---

## Classes détectées

| # | Classe | Label FR | Description |
|---|--------|----------|-------------|
| 0 | `mini_skirt` | Mini jupe | Jupes courtes, robes courtes |
| 1 | `headwear` | Couvre-chef | Casquettes, bonnets, chapeaux, turbans |
| 2 | `joggers` | Jogging | Pantalons de sport, survêtements |
| 3 | `sandals` | Sandales | Sandales ouvertes |
| 4 | `flip_flops` | Claquettes | Tongs, slides, claquettes Adidas |
| 5 | `ripped_clothes` | Habits troués | Vêtements déchirés ou troués |
| 6 | `sportswear` | Habits de sport | Maillots, hoodies, vêtements de marque sport |

---

## Datasets

### Sources Roboflow

| Dataset | Classe(s) cible(s) | Images |
|---------|-------------------|--------|
| `adidas-fjvhm-1dok0` | flip_flops | ~200 |
| `sandals-fnnnf-mt6yc` | sandals | ~510 |
| `sandals-qytxp-zkfga` | sandals | ~100 |
| `headwear-onnex-qjqis` | headwear | ~1 257 |
| `pants-6gyrt-nlavs` | joggers, mini_skirt, sportswear | ~500 |
| `skirt-hyd6u-nsc76` | mini_skirt, headwear, joggers | ~225 |
| `skirt-0hvba-qt8uc` | mini_skirt | ~543 |
| `bitirme-calismasi-svzen` | ripped_clothes | ~369 |
| `footest-rcn5t` | sportswear | ~1 315 |

### Stratégie de fusion

Le script `merge_datasets.py` :
1. **Télécharge** tous les datasets en format YOLOv8
2. **Mappe** les noms de classes bruts vers les 7 classes cibles via `class_mapping.py`
3. **Ignore** les classes non pertinentes (chemises classiques, vestes, longues jupes…)
4. **Applique des surcharges** par dataset si une même classe a un sens différent (ex : "Adidas" = flip_flops dans `adidas_slides`, mais sportswear dans `footest`)
5. **Équilibre** les classes (cap par médiane pour éviter de trop écraser les petites classes)
6. **Découpe** en train / val / test (70% / 20% / 10%)

### Audit des classes

Avant de fusionner, vérifier que tout est mappé correctement :

```bash
python data/merge_datasets.py --audit
```

Résultat type :
```
Dataset : sandals
  [OK]     Black Sandal  -> sandals
  [OK]     Sandal        -> sandals

Dataset : sportswear
  [OK]     Adidas        -> sportswear [OVERRIDE depuis flip_flops]
  [OK]     Nike          -> sportswear
  [OK]     Lacoste       -> sportswear
```

---

## Installation

### Prérequis

- Python 3.11+
- NVIDIA GPU recommandé (RTX 3060 12 Go utilisé pour ce projet)
- Clé API Roboflow

### Étapes

```bash
# 1. Créer l'environnement virtuel
python -m venv .venv
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # Linux / Mac

# 2. Installer PyTorch avec CUDA 12.4 (adapter selon ton GPU)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124

# Vérifier que le GPU est détecté
python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"

# 3. Installer les dépendances du projet
pip install -r requirements.txt
```

---

## Pipeline complète

```bash
# Étape 1 — Télécharger les datasets
python data/download_datasets.py --api-key TA_CLE_ROBOFLOW

# Étape 2 — Audit des classes (vérifier les mappings)
python data/merge_datasets.py --audit

# Étape 3 — Fusionner et équilibrer les datasets
python data/merge_datasets.py

# Étape 4 — Entraîner le modèle
python training/train.py --model-size m --epochs 200 --batch 16 --device 0

# Étape 5 — Lancer le système complet
python main.py
```

---

## Entraînement du modèle

### Commande principale

```bash
python training/train.py --model-size m --epochs 200 --batch 16 --device 0
```

### Options disponibles

| Argument | Valeur par défaut | Description |
|---|---|---|
| `--model-size` | `s` | Taille du modèle : `n` nano, `s` small, `m` medium, `l` large, `x` xlarge |
| `--epochs` | `100` | Nombre d'époques |
| `--batch` | `16` | Taille du batch (adapter selon la VRAM) |
| `--device` | auto | `0` = GPU 0, `cpu` = CPU |
| `--resume` | — | Reprendre depuis le dernier checkpoint |
| `--pretrained` | — | Fine-tuner depuis un modèle existant |

### Recommandations VRAM

| GPU VRAM | Batch size recommandé | Model size recommandé |
|---|---|---|
| 4 Go | 8 | n ou s |
| 8 Go | 16 | s ou m |
| **12 Go (RTX 3060)** | **16** | **m** |
| 16 Go+ | 32 | m ou l |

### Fine-tuning (amélioration rapide)

Pour améliorer le modèle sur de nouvelles données sans repartir de zéro :

```bash
python training/train.py \
  --pretrained training/runs/dress_code_detector/weights/best.pt \
  --epochs 50 \
  --batch 16 \
  --device 0
```

### Validation

```bash
python training/train.py --mode val
```

### Export (déploiement)

```bash
python training/train.py --mode export --format onnx
```

### Suivi avec TensorBoard

```bash
# Dans un terminal séparé
pip install tensorboard
tensorboard --logdir training/runs/dress_code_detector
# Ouvrir http://localhost:6006
```

---

## Résultats et métriques

### Historique des trainings

| | Training 1 | Training 2 | Training 3 |
|---|---|---|---|
| **Modèle de départ** | yolo11m.pt | best.pt (T1) | best.pt (T2) |
| **Epochs** | 200 | 50 | 25 |
| **Durée** | ~3h | ~48 min | ~20 min |
| **lr0** | 0.001 | 0.001 | **0.0001** |
| **mAP50** | 0.685 | 0.700 | **0.697** |
| **mAP50-95** | 0.446 | 0.470 | **0.482** |
| **Précision** | 0.736 | 0.787 | **0.761** |
| **Rappel** | 0.707 | 0.706 | **0.707** |
| **val/box_loss** | 1.661 | 1.485 | **1.470** |
| **val/cls_loss** | 1.315 | 1.167 | **1.139** |

> Le training 3 bénéficie d'un learning rate réduit (0.0001) adapté au fine-tuning, ce qui produit des ajustements plus fins et une val/loss plus basse malgré moins d'epochs.

#### Commandes utilisées

```bash
# Training 1 — from scratch
python training/train.py --model-size m --epochs 200 --batch 16 --device 0

# Training 2 — fine-tuning (lr trop élevé)
python training/train.py --pretrained training/runs/dress_code_detector/weights/best.pt --epochs 50 --batch 16 --device 0

# Training 3 — fine-tuning optimisé (lr réduit automatiquement)
python training/train.py --pretrained training/runs/dress_code_detector2/weights/best.pt --epochs 25 --batch 16 --device 0
```

### mAP50 par classe (Training 1 — référence)

| Classe | mAP50 | Évaluation |
|---|---|---|
| joggers | **0.995** | Excellent |
| mini_skirt | **0.947** | Excellent |
| headwear | **0.947** | Excellent |
| sandals | 0.622 | Moyen |
| sportswear | 0.611 | Moyen |
| ripped_clothes | 0.373 | À améliorer |
| flip_flops | 0.267 | À améliorer |

### Courbes générées automatiquement

Après chaque entraînement, les fichiers suivants sont générés dans `training/runs/dress_code_detector/` :

---

#### `results.png` — Vue d'ensemble de l'entraînement

![results](https://res.cloudinary.com/drlngpuiq/image/upload/v1774605193/checkyourdrip/training/results.png)

Montre l'évolution sur toutes les époques de :
- `train/box_loss` — erreur de localisation des boîtes (doit descendre)
- `train/cls_loss` — erreur de classification des classes (doit descendre)
- `train/dfl_loss` — distribution focal loss (doit descendre)
- `metrics/precision` — précision sur le set de validation
- `metrics/recall` — rappel sur le set de validation
- `metrics/mAP50` — mAP à seuil IoU 50% (métrique principale)
- `metrics/mAP50-95` — mAP moyen de IoU 50% à 95%

> **Comment lire** : les courbes de loss doivent descendre et se stabiliser. Si la val_loss remonte alors que la train_loss descend → surapprentissage (overfitting).

---

#### `BoxPR_curve.png` — Courbe Précision / Rappel

![BoxPR_curve](https://res.cloudinary.com/drlngpuiq/image/upload/v1774605189/checkyourdrip/training/BoxPR_curve.png)

Montre le compromis précision/rappel pour chaque classe à différents seuils de confiance. L'aire sous la courbe = mAP50.

> **Comment lire** : plus la courbe est proche du coin supérieur droit (précision=1, rappel=1), meilleure est la classe.

---

#### `BoxP_curve.png` — Courbe de Précision

![BoxP_curve](https://res.cloudinary.com/drlngpuiq/image/upload/v1774605190/checkyourdrip/training/BoxP_curve.png)

Précision en fonction du seuil de confiance.

> **Comment lire** : une haute précision signifie peu de faux positifs. Augmenter le seuil de confiance améliore la précision mais réduit le rappel.

---

#### `BoxR_curve.png` — Courbe de Rappel

![BoxR_curve](https://res.cloudinary.com/drlngpuiq/image/upload/v1774605190/checkyourdrip/training/BoxR_curve.png)

Rappel en fonction du seuil de confiance.

> **Comment lire** : un haut rappel signifie que le modèle manque peu de vraies infractions. Baisser le seuil améliore le rappel mais génère plus de faux positifs.

---

#### `BoxF1_curve.png` — Courbe F1

![BoxF1_curve](https://res.cloudinary.com/drlngpuiq/image/upload/v1774605188/checkyourdrip/training/BoxF1_curve.png)

F1-score (harmonie entre précision et rappel) en fonction du seuil de confiance. Le **pic de cette courbe indique le seuil de confiance optimal** à utiliser pour la détection.

> **Comment lire** : trouver le seuil (axe X) où le F1 est maximal → c'est la valeur à mettre dans `config.py` pour `CONFIDENCE_THRESHOLD`.

---

#### `confusion_matrix_normalized.png` — Matrice de confusion

![confusion_matrix_normalized](https://res.cloudinary.com/drlngpuiq/image/upload/v1774605191/checkyourdrip/training/confusion_matrix_normalized.png)

Montre pour chaque classe quel pourcentage d'images est correctement classé, et vers quelles autres classes il y a confusion.

> **Comment lire** : la diagonale doit être la plus brillante possible. Une case hors diagonale brillante = le modèle confond deux classes ensemble.

---

#### `labels.jpg` — Distribution des labels

![labels](https://res.cloudinary.com/drlngpuiq/image/upload/v1774605192/checkyourdrip/training/labels.jpg)

Montre la répartition des classes et la distribution spatiale des bounding boxes dans le dataset.

> **Comment lire** : si une classe est sous-représentée par rapport aux autres, c'est là que les performances seront les plus faibles.

---

#### Batchs d'entraînement — `train_batch*.jpg`

| Début d'entraînement | Fin d'entraînement |
|---|---|
| ![train_batch0](https://res.cloudinary.com/drlngpuiq/image/upload/v1774605194/checkyourdrip/training/train_batch0.jpg) | ![train_batch_end](https://res.cloudinary.com/drlngpuiq/image/upload/v1774605195/checkyourdrip/training/train_batch21660.jpg) |

Exemples d'images avec les annotations réelles utilisées pendant l'entraînement. On observe l'amélioration de la qualité des détections entre le début et la fin.

---

#### Validation — labels vs prédictions

| Vérité terrain (`_labels`) | Prédictions du modèle (`_pred`) |
|---|---|
| ![val_labels0](https://res.cloudinary.com/drlngpuiq/image/upload/v1774605196/checkyourdrip/training/val_batch0_labels.jpg) | ![val_pred0](https://res.cloudinary.com/drlngpuiq/image/upload/v1774605197/checkyourdrip/training/val_batch0_pred.jpg) |
| ![val_labels1](https://res.cloudinary.com/drlngpuiq/image/upload/v1774605198/checkyourdrip/training/val_batch1_labels.jpg) | ![val_pred1](https://res.cloudinary.com/drlngpuiq/image/upload/v1774605198/checkyourdrip/training/val_batch1_pred.jpg) |
| ![val_labels2](https://res.cloudinary.com/drlngpuiq/image/upload/v1774605199/checkyourdrip/training/val_batch2_labels.jpg) | ![val_pred2](https://res.cloudinary.com/drlngpuiq/image/upload/v1774605199/checkyourdrip/training/val_batch2_pred.jpg) |

> **Comment lire** : comparer `_labels` (vérité terrain) et `_pred` (prédictions). Si les boîtes et labels sont similaires → le modèle apprend bien.

---

## Intégration cloud (Supabase + MongoDB + Cloudinary)

### Architecture d'envoi

```
Violation détectée (cooldown 3s)
  ├─► Cloudinary              — photo JPEG annotée → dossier checkyourdrip/detections/
  ├─► MongoDB Atlas (Logs)    — log enrichi avec URL photo
  └─► Supabase (detections)   — log structuré avec mongo_id = _id MongoDB
```

### Configuration

Copier `.env.example` en `.env` et remplir :

```env
# Supabase — Settings → API
SUPABASE_URL=https://ton-projet.supabase.co
SUPABASE_KEY=ta_cle_service_role

# MongoDB Atlas — Connect → Drivers → URI
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
MONGO_DB=db-CheckYourDrip

# Cloudinary — Dashboard → API Keys
CLOUDINARY_CLOUD_NAME=ton_cloud_name
CLOUDINARY_API_KEY=ta_api_key
CLOUDINARY_API_SECRET=ton_api_secret
```

### Initialisation Supabase

Créer la table depuis l'éditeur SQL de Supabase :

```sql
CREATE TABLE detections (
    id           SERIAL PRIMARY KEY,
    detected_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    object_class VARCHAR(100) NOT NULL,
    confidence   FLOAT        NOT NULL,
    seen         BOOLEAN      NOT NULL DEFAULT FALSE,
    mongo_id     VARCHAR(24)           -- _id du document MongoDB lié
);
```

### Schéma MongoDB — collection `Logs`

```json
{
  "_id":          "ObjectId",
  "dateLog":      "2025-01-01T12:00:00+00:00",
  "photo":        "https://res.cloudinary.com/...",
  "verification": false,
  "objectClass":  "mini_skirt"
}
```

### Comportement

- Chaque scan déclenche un envoi si le **cooldown de 3 secondes** est écoulé
- Pour chaque classe détectée : 1 document MongoDB + 1 ligne Supabase liée via `mongo_id`
- La photo est uploadée une seule fois par scan sur Cloudinary
- L'envoi est **non-bloquant** (thread séparé, ne ralentit pas la vidéo)
- Le cooldown restant est affiché en bleu en bas à droite de la fenêtre

---

## Lancer le système

### Mode complet (recommandé)

Lance le serveur et la détection en une seule commande :

```bash
python main.py
```

### Mode séparé (deux terminaux)

**Terminal 1 — Serveur de notifications**
```bash
python server/app.py
# Dashboard disponible sur http://localhost:8000
```

**Terminal 2 — Détection webcam**
```bash
python detection/webcam_app.py
```

### Options de la détection webcam

```bash
python detection/webcam_app.py --model training/runs/dress_code_detector/weights/best.pt
python detection/webcam_app.py --cam 1        # utiliser webcam index 1
python detection/webcam_app.py --no-auto      # désactiver notifications automatiques
```

### Touches de contrôle

| Touche | Action |
|---|---|
| `N` | Envoyer une notification manuelle |
| `S` | Activer / désactiver la notification automatique |
| `ESPACE` | Pause / Reprise |
| `Q` ou `ESC` | Quitter |

### Dashboard web

Ouvrir **http://localhost:8000** dans le navigateur.

- Alertes en temps réel via WebSocket
- Capture d'écran au moment de l'infraction
- Historique des 200 dernières alertes
- Statistiques du jour

---

## Améliorer le modèle

### Workflow d'amélioration par classe

1. Identifier les classes faibles via la validation :
```bash
python training/train.py --mode val
```

2. Trouver de nouveaux datasets sur [universe.roboflow.com](https://universe.roboflow.com) (filtre **Object Detection**)

3. Ajouter le dataset dans `data/download_datasets.py` :
```python
{
    "workspace": "workspace_name",
    "project":   "project-slug",
    "version":   1,
    "name":      "nom_local",
    "classes_hint": ["classe1", "classe2"],
},
```

4. Re-télécharger, re-fusionner, fine-tuner :
```bash
python data/download_datasets.py --api-key TA_CLE
python data/merge_datasets.py --audit
python data/merge_datasets.py
python training/train.py --pretrained training/runs/dress_code_detector/weights/best.pt --epochs 50 --batch 16 --device 0
```

### Ajouter ses propres images

1. Aller sur [app.roboflow.com](https://app.roboflow.com) → ton projet
2. Upload → annoter les bounding boxes
3. Generate → Export YOLOv8
4. Ajouter dans `download_datasets.py` et re-lancer la pipeline

### Ajuster le seuil de confiance

Dans `config.py` :
```python
CONFIDENCE_THRESHOLD = 0.50   # augmenter = moins de faux positifs
                               # diminuer  = moins de faux négatifs
```

Utiliser la courbe `BoxF1_curve.png` pour choisir le seuil optimal.

---

## Application web

Dashboard de surveillance déployable, indépendant du code Python. Il se connecte aux services cloud déjà alimentés par la détection (Supabase, MongoDB, Cloudinary) et ajoute les notifications push et email.

### Architecture

```
src/
├── app/
│   ├── page.tsx                   ← Dashboard temps réel
│   ├── settings/page.tsx          ← Paramètres email & push
│   └── api/
│       ├── detections/            ← GET liste enrichie (Supabase + MongoDB)
│       ├── detections/[id]/       ← PATCH seen / verification
│       ├── stats/                 ← Compteurs du jour par classe
│       ├── push/subscribe/        ← Abonnement Web Push
│       ├── push/notify/           ← Webhook Supabase → push + email
│       └── notifications/         ← Paramètres email (GET / PUT)
├── components/
│   ├── Dashboard.tsx              ← Feed temps réel, filtres, actions
│   ├── DetectionCard.tsx          ← Photo Cloudinary, classe, confiance, boutons
│   ├── StatsBar.tsx               ← Compteurs du jour
│   └── PushManager.tsx            ← Activation notifications push navigateur
└── lib/
    ├── supabase.ts                ← Client anon (realtime) + admin (API routes)
    ├── mongodb.ts                 ← Lecture collection Logs (photo, verification)
    ├── push.ts                    ← Envoi Web Push VAPID à tous les abonnés
    ├── email.ts                   ← Envoi email via Resend
    └── constants.ts               ← Labels et couleurs des 7 classes
```

### Stack

| Rôle | Techno |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Style | Tailwind CSS |
| Temps réel | Supabase Realtime (postgres_changes) |
| Push navigateur | Web Push API + VAPID (`web-push`) |
| Email | Resend |
| Déploiement | Vercel |

### Installation

```bash
# 1. Variables d'environnement
cp .env.local.example .env.local
# Remplir les valeurs (voir section Configuration)

# 2. Générer les clés VAPID (push notifications)
npm run generate-vapid
# Copier les deux clés dans .env.local

# 3. Installer et lancer
npm install
npm run dev
# http://localhost:3000
```

### Configuration

#### Supabase — tables supplémentaires

Exécuter `supabase-setup.sql` dans **Supabase → SQL Editor** :

```sql
-- Abonnements push navigateurs
CREATE TABLE push_subscriptions (
    id           SERIAL PRIMARY KEY,
    endpoint     TEXT UNIQUE NOT NULL,
    subscription JSONB NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Paramètres de notification (une seule ligne)
CREATE TABLE notification_settings (
    id               INTEGER PRIMARY KEY DEFAULT 1,
    email_addresses  TEXT[]  DEFAULT '{}',
    email_enabled    BOOLEAN DEFAULT FALSE,
    min_confidence   FLOAT   DEFAULT 0.5,
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO notification_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Activer le Realtime sur detections
ALTER TABLE detections REPLICA IDENTITY FULL;
```

> Activer aussi le Realtime dans **Supabase → Database → Replication → detections**.

#### Variables d'environnement

| Variable | Où la trouver |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (ne pas exposer côté client) |
| `MONGO_URI` | MongoDB Atlas → Connect → Drivers |
| `MONGO_DB` | Nom de la base (`db-CheckYourDrip`) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Généré avec `npm run generate-vapid` |
| `VAPID_PRIVATE_KEY` | Généré avec `npm run generate-vapid` |
| `VAPID_EMAIL` | `mailto:ton-email@example.com` |
| `RESEND_API_KEY` | [resend.com](https://resend.com) → API Keys |
| `EMAIL_FROM` | Domaine vérifié dans Resend (ou `onboarding@resend.dev` en test) |
| `WEBHOOK_SECRET` | Secret aléatoire choisi par toi (voir ci-dessous) |
| `NEXT_PUBLIC_APP_URL` | URL de déploiement (ex: `https://checkyourdrip.vercel.app`) |

#### Resend — domaine expéditeur

1. [resend.com](https://resend.com) → **Domains** → **Add Domain**
2. Ajouter les enregistrements DNS fournis (TXT + MX) chez ton registrar
3. Cliquer **Verify** → utiliser `noreply@ton-domaine.com` dans `EMAIL_FROM`

> Sans domaine personnalisé, utiliser `onboarding@resend.dev` (emails reçus uniquement sur l'adresse du compte Resend).

#### Webhook Supabase → notifications automatiques

Le webhook déclenche push + email à chaque nouvelle détection.

1. **Générer le secret** :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copier le résultat dans `.env.local` → `WEBHOOK_SECRET=...`

2. **Créer le webhook** dans Supabase → **Database → Webhooks** :

| Champ | Valeur |
|---|---|
| Name | `detection-notify` |
| Table | `detections` |
| Events | `INSERT` |
| URL | `https://[ton-app].vercel.app/api/push/notify` |
| Header | `x-webhook-secret` = valeur de `WEBHOOK_SECRET` |

> En développement local, exposer le port 3000 avec [ngrok](https://ngrok.com) : `ngrok http 3000`, puis utiliser l'URL ngrok dans le webhook.

### Déploiement sur Vercel

```bash
# 1. Push sur GitHub
git add .
git commit -m "Add web application"
git push

# 2. Importer le projet sur vercel.com
# 3. Ajouter toutes les variables d'environnement dans Vercel → Settings → Environment Variables
# 4. Mettre à jour NEXT_PUBLIC_APP_URL avec l'URL Vercel
# 5. Mettre à jour l'URL du webhook Supabase avec l'URL Vercel
```

### Fonctionnalités du dashboard

| Fonctionnalité | Description |
|---|---|
| Feed temps réel | Nouvelles détections sans rechargement (Supabase Realtime) |
| Photo annotée | Image Cloudinary intégrée dans chaque carte |
| Filtres | Par classe, non consultées seulement |
| Statistiques | Compteurs du jour par classe |
| Marquer vu | Passe `seen = true` dans Supabase |
| Vérification | Confirme ou marque en faux positif (mis à jour dans MongoDB) |
| Toast d'alerte | Notification visuelle à chaque nouvelle infraction |
| Push navigateur | Notification même fenêtre fermée (mobile + desktop) |
| Email | Email avec photo à chaque infraction (seuil de confiance configurable) |
| Paramètres | Page dédiée pour gérer emails et seuil de confiance |

---

## TODO — Pistes d'amélioration

### Sécurité & accès

- [ ] **Authentification** — Ajouter un login (Supabase Auth ou NextAuth) pour protéger le dashboard. Actuellement le dashboard est accessible sans mot de passe à quiconque connaît l'URL.
- [ ] **Rôles utilisateurs** — Distinguer admin (accès paramètres + reset) et observateur (lecture seule).
- [ ] **Rate limiting** — Limiter les appels aux routes API pour éviter les abus (ex: librairie `@upstash/ratelimit`).

### UX & mobile

- [ ] **PWA installable** — Ajouter un `manifest.json` pour permettre l'installation sur l'écran d'accueil mobile (icône, splash screen, mode standalone).
- [ ] **Mode hors-ligne** — Mettre en cache les dernières détections avec un service worker pour consulter le feed sans connexion.
- [ ] **Swipe pour marquer vu** — Geste swipe sur mobile sur une DetectionCard pour la marquer comme vue.
- [ ] **Dark/light mode** — Ajouter un toggle de thème (actuellement dark uniquement).

### Fonctionnalités dashboard

- [ ] **Pagination / infinite scroll** — Charger les détections au défilement plutôt que de limiter à 50.
- [ ] **Export CSV** — Exporter les détections filtrées en CSV pour analyse externe.
- [ ] **Graphiques** — Visualiser les infractions dans le temps (par heure, par jour, par classe) avec une librairie type Recharts.
- [ ] **Recherche** — Chercher dans les détections par date, classe ou confiance.
- [ ] **Commentaires** — Ajouter une note textuelle sur une détection (contexte, action prise…).

### Modèle & détection

- [ ] **Nouvelles classes** — Ajouter des classes manquantes : `shorts`, `crop_top`, `sleeveless`, `barefoot`…
- [ ] **Seuil par classe** — Configurer un seuil de confiance différent par classe depuis les paramètres (ex : mini_skirt à 0.6, flip_flops à 0.4).
- [ ] **Déduplication améliorée** — Éviter de re-notifier pour la même personne encore présente dans le champ de la caméra (suivi d'objet entre frames).
- [ ] **Multi-caméras** — Gérer plusieurs flux webcam simultanément avec un identifiant de caméra par détection.

### KPIs & métriques métier

- [ ] **Taux de faux positifs** — Suivre le ratio détections marquées "faux positif" via la vérification / total détections, pour mesurer la fiabilité du modèle en conditions réelles.
- [ ] **Taux de traitement** — % de détections consultées (seen) et vérifiées, pour savoir si les agents suivent les alertes.
- [ ] **Temps de réaction** — Délai moyen entre `detected_at` et le marquage `seen`, pour évaluer la réactivité des opérateurs.
- [ ] **Infractions par heure / par jour** — Courbe de charge pour identifier les pics (heure d'ouverture, événements…).
- [ ] **Top classes** — Classement des infractions les plus fréquentes sur une période glissante (7j, 30j).
- [ ] **Taux de notification délivrée** — % de push notifications envoyées avec succès vs erreurs (suivi des échecs `web-push`).
- [ ] **Page KPI dédiée** — Créer une page `/stats` dans le dashboard avec ces métriques affichées en graphiques et tableaux, distincte du feed temps réel.

### Infrastructure

- [ ] **Logs d'erreurs** — Intégrer Sentry ou LogRocket pour tracer les erreurs frontend/API en production.
- [ ] **Tests** — Ajouter des tests unitaires sur les routes API (Jest + Supertest) et des tests E2E (Playwright).
- [ ] **CI/CD** — Pipeline GitHub Actions : lint + tests avant chaque merge sur `main`.
