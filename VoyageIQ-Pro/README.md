# VoyageIQ Pro — Plateforme de Gestion Transport

Tableau de bord de gestion de transport interurbain pour agences de voyage au Cameroun.  
Stack : **Python 3.10+ / Flask / SQLite / Jinja2**

---

## 📁 Structure du projet

```
VoyageIQ-Pro/
├── app/
│   ├── blueprints/          # Modules (auth, dashboard, saisie, lignes, flotte, finance…)
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── saisie/
│   │   ├── lignes/
│   │   ├── flotte/
│   │   ├── finance/
│   │   ├── operations/
│   │   ├── clientele/
│   │   ├── analytique/
│   │   ├── alertes/
│   │   ├── admin/
│   │   └── api/
│   ├── models/              # Modèles SQLAlchemy
│   │   ├── utilisateur.py   # Authentification + rôles
│   │   ├── ligne.py
│   │   ├── vehicule.py
│   │   ├── saisie.py
│   │   └── alerte.py
│   ├── services/            # Logique métier
│   │   ├── kpi_service.py
│   │   └── alerte_service.py
│   ├── utils/
│   │   ├── decorators.py    # @role_required, @can_saisir, @niveau_min
│   │   └── helpers.py
│   ├── static/
│   │   ├── css/
│   │   │   ├── base/        # reset.css, variables.css, main.css
│   │   │   ├── components/  # navbar.css, footer.css, alerts.css
│   │   │   └── pages/       # dashboard.css, login.css, etc.
│   │   └── js/
│   │       ├── main.js
│   │       └── modules/     # dashboard.js, saisie.js, etc.
│   └── templates/
│       ├── base/base.html   # Template parent (navbar + footer)
│       ├── auth/login.html
│       ├── dashboard/
│       ├── saisie/
│       ├── lignes/
│       ├── flotte/
│       ├── finance/
│       ├── operations/
│       ├── clientele/
│       ├── analytique/
│       ├── alertes/
│       ├── admin/
│       └── errors/          # 404.html, 500.html
├── config/settings.py
├── database/seeds/init_db.py
├── run.py
└── requirements.txt
```

---

## 🚀 Installation rapide

```bash
# 1. Cloner / décompresser le projet
cd VoyageIQ-Pro

# 2. Environnement virtuel
python3 -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

# 3. Dépendances
pip install -r requirements.txt

# 4. Variables d'environnement
cp .env.example .env
# Modifiez .env selon vos besoins

# 5. Initialiser la base de données + données démo
python database/seeds/init_db.py

# 6. Lancer le serveur
python run.py
# → http://localhost:5000
```

---

## 👤 Comptes de démonstration

| Identifiant | Mot de passe    | Rôle               | Accès                                      |
|-------------|-----------------|--------------------|--------------------------------------------|
| `admin`     | `Admin@VIQ2026` | Administrateur     | Tout + gestion utilisateurs                |
| `dg.01`     | `DG@2026`       | Direction Générale | Dashboard, Finance, Analytique, Flotte…    |
| `chef.01`   | `Chef1@2026`    | Chef d'Agence      | Saisie, Lignes, Flotte, Opérations…        |
| `sup.01`    | `Sup1@2026`     | Superviseur Terrain| Saisie, Opérations, Alertes                |
| `audit.01`  | `Audit1@2026`   | Auditeur           | Dashboard, Analytique, Alertes             |

---

## 🔐 Système de rôles

```
Niveau 5 → admin       : accès total + administration
Niveau 4 → dg          : vision globale, pas de saisie
Niveau 3 → chef        : saisie + gestion opérationnelle
Niveau 2 → superviseur : saisie terrain uniquement
Niveau 1 → auditeur    : lecture seule, analytique
```

Décorateurs disponibles dans `app/utils/decorators.py` :
- `@role_required('admin', 'dg')` — par rôle
- `@niveau_min(3)` — par niveau hiérarchique
- `@can_saisir` — peut faire des saisies

---

## 📊 Modules disponibles

| Module       | URL              | Description                                  |
|-------------|-----------------|----------------------------------------------|
| Dashboard    | `/dashboard/`   | KPIs globaux — 30 derniers jours             |
| Saisie       | `/saisie/`      | Saisie journalière d'exploitation            |
| Lignes       | `/lignes/`      | Gestion des trajets et créneaux              |
| Flotte       | `/flotte/`      | Suivi véhicules, maintenance, documents      |
| Finance      | `/finance/`     | Recettes, dépenses, marges, ratios           |
| Opérations   | `/operations/`  | Voyages, retards, annulations                |
| Clientèle    | `/clientele/`   | NPS, réclamations, satisfaction              |
| Analytique   | `/analytique/`  | Graphiques et analyse de tendances           |
| Alertes      | `/alertes/`     | Alertes auto (maintenance, documents)        |
| Admin        | `/admin/`       | Gestion des utilisateurs                     |
| API JSON     | `/api/kpis`     | Données KPI au format JSON                   |

---

## 🌍 Contexte

- **Pays** : Cameroun (Yaoundé)  
- **Base de données** : SQLite (dev) — migratable vers PostgreSQL  
- **Framework** : Flask 3.x avec Blueprints  
- **Authentification** : Flask-Login + hachage Werkzeug  
- **Frontend** : Jinja2, CSS custom (thème sombre gold), Font Awesome  

---

© 2024–2026 VoyageIQ Pro · Afrique Centrale
