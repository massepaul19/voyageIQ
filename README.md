# VoyageIQ-Pro

> **Système ERP de Gestion de Transport Interurbain**  
> Plateforme web intégrée pour le pilotage opérationnel, financier et humain d'une agence de transport.

---

## 👥 Équipe Projet

| Nom & Prénom | Département | Rôle |
| :--- | :---: | :--- |
| Membre 1 *(à compléter)* | Transport & Logistique | Domaine métier |
| Membre 2 *(à compléter)* | Transport & Logistique | Domaine métier |
| Membre 3 *(à compléter)* | Transport & Logistique | Domaine métier |
| Membre 4 *(à compléter)* | Transport & Logistique | Domaine métier |
| Membre 5 *(à compléter)* | Transport & Logistique | Domaine métier |
| **Masse Masse Paul-Basthylle** | **Informatique** | **Développement** |

**Encadreur :** Dr. Prosper — Département Transport & Logistique, ESTLC  
**Institution :** ESTLC — École Supérieure de Transport et de Logistique du Cameroun  
**Année académique :** 2025–2026  
**Nature :** Projet Professionnel

---

## 🚀 Fonctionnalités

### Espace Public (Vitrine)
- Landing page professionnelle avec statistiques dynamiques
- Présentation des lignes, modules et services
- Formulaire de contact et mentions légales
- Accès à l'administration via bouton dédié (login modal)

### Espace Administratif (5 niveaux d'accès)
- **Dashboard** — KPIs temps réel, graphiques d'exploitation
- **Saisie** — Formulaire complet de rapport journalier par ligne
- **Flotte** — Suivi technique des véhicules, alertes maintenance
- **Lignes** — Gestion des itinéraires et paramètres tarifaires
- **Finance** — Recettes, dépenses, marges par ligne et période
- **Opérations** — Suivi des voyages, retards, incidents
- **Clientèle** — Avis clients, NPS, réclamations
- **Analytique** — Rapports croisés et tendances
- **Alertes** — Notifications automatiques (maintenance, documents)
- **Rapports** — Génération PDF, envoi email / WhatsApp
- **Admin** — Gestion utilisateurs, chauffeurs, configuration

### Espace Chauffeur
- Inscription avec validation administrateur
- Dashboard personnel (courses, km, ponctualité)
- Historique des courses par ligne et véhicule
- Statistiques de performance individuelles
- Suivi de maintenance du véhicule assigné
- Localisation sur carte (Leaflet.js)
- Modification du profil et photo

---

## 🛠️ Stack Technique

| Couche | Technologie |
| :--- | :--- |
| **Backend** | Python 3.10+ / Flask |
| **ORM** | SQLAlchemy |
| **Base de données** | SQLite (dev) / PostgreSQL (prod) |
| **Authentification** | Flask-Login + Werkzeug (PBKDF2) |
| **Sécurité** | Flask-WTF (CSRF) |
| **Frontend** | Jinja2 + CSS Custom + JavaScript |
| **Cartographie** | Leaflet.js + OpenStreetMap |
| **Rapports PDF** | WeasyPrint / jsPDF |

---

## 📂 Structure du Projet

```
VoyageIQ-Pro/
├── app/
│   ├── blueprints/          # Routes (bp_<module>.py — structure plate)
│   │   ├── bp_auth.py
│   │   ├── bp_public.py
│   │   ├── bp_dashboard.py
│   │   ├── bp_chauffeur.py
│   │   └── ...              # un fichier par module
│   ├── models/
│   │   ├── utilisateur.py   # Auth téléphone, RBAC, profil enrichi
│   │   ├── chauffeur.py     # Espace chauffeur + CourseChauffeur
│   │   ├── vehicule.py
│   │   ├── ligne.py
│   │   ├── saisie.py
│   │   └── alerte.py
│   ├── services/
│   │   ├── kpi_service.py   # Calculs KPI (taux remplissage, marge...)
│   │   └── alerte_service.py# Moteur d'alertes automatiques
│   ├── static/
│   │   ├── css/
│   │   │   ├── base/        # variables.css, reset.css, animations.css
│   │   │   ├── components/  # sidebar, navbar, cards, forms...
│   │   │   └── pages/       # un fichier CSS par page
│   │   ├── js/modules/      # un fichier JS par module
│   │   └── images/          # avatars, chauffeurs, vehicules, logos
│   ├── templates/
│   │   ├── admin/           # Pages espace administratif
│   │   ├── chauffeur/       # Pages espace chauffeur
│   │   ├── public/          # Vitrine (index, about, contact...)
│   │   ├── base/            # base_admin.html, base_chauffeur.html, base_public.html
│   │   └── components/      # Composants réutilisables
│   └── utils/
│       ├── decorators.py    # @role_required, @niveau_required
│       └── helpers.py
├── config/
│   └── settings.py          # Dev / Prod / SECRET_KEY / Upload paths
├── database/
│   ├── seeds/
│   │   └── init_db.py       # Initialisation + données démo
│   └── voyageiq.db
├── docs/                    # Documentation technique
├── projet.tex               # Rapport LaTeX
└── run.py
```

---

## ⚙️ Installation

### 1. Cloner le projet
```bash
git clone <url-du-repo>
cd VoyageIQ-Pro
```

### 2. Créer un environnement virtuel
```bash
python -m venv venv
source venv/bin/activate       # Linux / macOS
# venv\Scripts\activate        # Windows
```

### 3. Installer les dépendances
```bash
pip install -r requirements.txt
```

### 4. Initialiser la base de données
```bash
python database/seeds/init_db.py
# Pour repartir de zéro :
python database/seeds/init_db.py --reset
```

### 5. Lancer l'application
```bash
python run.py
```
Accès : [http://localhost:5000](http://localhost:5000)

---

## 🔐 Authentification

L'authentification se fait par **numéro de téléphone + mot de passe**.  
Les deux formats sont acceptés : `+237XXXXXXXXX` ou `XXXXXXXXX`

### Comptes de démonstration — Espace Admin

| Téléphone | Mot de passe | Rôle |
| :--- | :--- | :--- |
| +237690000001 | Admin@VIQ2026 | Administrateur |
| +237677000010 | DG@VIQ2026 | Direction Générale (Mbarga J-P) |
| +237655000100 | Chef1@VIQ2026 | Chef d'Agence — Yaoundé |
| +237666000200 | Chef2@VIQ2026 | Chef d'Agence — Douala |
| +237655001001 | Sup1@VIQ2026 | Superviseur — Yaoundé |
| +237677002001 | Audit1@VIQ2026 | Auditeur |

### Comptes de démonstration — Espace Chauffeur

| Téléphone | Mot de passe | Chauffeur |
| :--- | :--- | :--- |
| +237677100001 | Chauf1@VIQ2026 | Tsafack Hervé *(validé)* |
| +237655100002 | Chauf2@VIQ2026 | Nganou Alphonse *(validé)* |
| +237699100003 | Chauf3@VIQ2026 | Kamga Rodrigue *(validé)* |
| +237677200004 | Fouda@2026 | Fouda Serge *(en attente de validation)* |

---

## 👥 Rôles et Permissions

| Rôle | Niveau | Pages accessibles |
| :--- | :---: | :--- |
| **Administrateur** | 5 | Tout — configuration, utilisateurs, chauffeurs |
| **Direction Générale** | 4 | Dashboard, finance, analytique, rapports, alertes |
| **Chef d'Agence** | 3 | Dashboard, saisie, flotte, opérations, chauffeurs |
| **Superviseur Terrain** | 2 | Dashboard, saisie, opérations, alertes |
| **Auditeur** | 1 | Dashboard, analytique, alertes |

---

## 🗺️ Routes Principales

| Préfixe | Module |
| :--- | :--- |
| `/` | Public (vitrine) |
| `/auth` | Authentification admin |
| `/chauffeur` | Espace chauffeur |
| `/dashboard` | Tableau de bord |
| `/saisie` | Saisie journalière |
| `/flotte` | Gestion flotte |
| `/finance` | Finances |
| `/rapports` | Rapports PDF |
| `/api` | API REST interne |

---

## 🔄 Commandes Utiles

```bash
# Réinitialiser la BDD avec les données démo
python database/seeds/init_db.py --reset

# Lancer en mode développement
FLASK_ENV=development python run.py

# Vérifier la structure du projet
tree app/ -I '__pycache__|*.pyc'
```

---

*VoyageIQ-Pro — ESTLC, Département Transport & Logistique — 2025-2026*  
*Développé par une équipe pluridisciplinaire Transport × Informatique*
