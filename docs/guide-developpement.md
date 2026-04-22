# Guide de Développement — VoyageIQ-Pro

> Document de référence pour l'équipe.  
> Montre ce qui est fait, ce qui reste à faire, et comment continuer proprement.

---

## ✅ État Actuel du Projet

### Ce qui est en place (fondations solides)

```
✅ Structure du projet réorganisée et propre
✅ Modèles SQLAlchemy (7 entités)
✅ Système d'authentification dual (Admin par tél. / Chauffeur par tél.)
✅ Blueprints organisés en fichiers plats (bp_<module>.py)
✅ Configuration multi-environnements (Dev / Prod)
✅ Base de données initialisée avec données démo réelles
✅ Structure des templates (admin / chauffeur / public / base / components)
✅ Structure CSS/JS (base / components / pages / modules)
✅ Dossiers d'upload configurés (avatars, chauffeurs, vehicules)
```

### Modèles disponibles

| Fichier | Table | Statut |
| :--- | :--- | :---: |
| `utilisateur.py` | `utilisateurs` | ✅ Complet |
| `chauffeur.py` | `chauffeurs` + `courses_chauffeurs` | ✅ Complet |
| `vehicule.py` | `vehicules` | ✅ Complet |
| `ligne.py` | `lignes` | ✅ Complet |
| `saisie.py` | `saisies` | ✅ Complet |
| `alerte.py` | `alertes` | ✅ Complet |

---

## 🗺️ Roadmap de Développement

### PHASE 1 — Squelettes HTML (Templates de base)
*À faire en priorité — tout le reste dépend de ça*

```
[ ] base/base_public.html     — Layout vitrine (navbar, footer)
[ ] base/base_admin.html      — Layout admin (sidebar, topbar, flash messages)
[ ] base/base_chauffeur.html  — Layout espace chauffeur
[ ] errors/404.html
[ ] errors/500.html
```

### PHASE 2 — Authentification
```
[ ] auth/admin_login.html           — Connexion admin par téléphone
[ ] chauffeur/chauffeur_login.html  — Connexion chauffeur
[ ] chauffeur/chauffeur_inscription.html       — Formulaire inscription
[ ] chauffeur/chauffeur_inscription_attente.html — Page d'attente validation

[ ] bp_auth.py      — Routes login/logout admin
[ ] bp_chauffeur.py — Routes login/logout/inscription chauffeur
[ ] utils/decorators.py — @login_required_admin, @role_required(niveau)
```

### PHASE 3 — Vitrine Publique
```
[ ] public/index.html       — Landing page (reprendre VoyageIQ_évolution1_0.html)
[ ] public/about.html       — À propos de l'agence
[ ] public/contact.html     — Formulaire de contact
[ ] public/localisation.html— Carte des agences

[ ] bp_public.py            — Routes publiques
```

### PHASE 4 — Dashboard Admin
```
[ ] admin/admin_dashboard.html  — KPIs, graphiques, alertes récentes
[ ] bp_dashboard.py             — Route + injection des KPIs
[ ] services/kpi_service.py     — Calculs KPI (déjà présent, à enrichir)
[ ] js/modules/dashboard.js     — Graphiques Chart.js
```

### PHASE 5 — Modules Opérationnels
*(dans cet ordre recommandé)*
```
[ ] Lignes     — admin_lignes.html + bp_lignes.py
[ ] Flotte     — admin_flotte.html + bp_flotte.py + modifier_vehicule.html
[ ] Saisie     — admin_saisie.html + bp_saisie.py
[ ] Opérations — admin_operations.html + bp_operations.py
[ ] Finance    — admin_finance.html + bp_finance.py
[ ] Clientèle  — admin_clientele.html + bp_clientele.py
[ ] Analytique — admin_analytique.html + bp_analytique.py
[ ] Alertes    — admin_alertes.html + bp_alertes.py
```

### PHASE 6 — Gestion des Utilisateurs & Chauffeurs (Admin)
```
[ ] admin/admin_utilisateurs.html   — Liste + création utilisateurs
[ ] admin/modifier_utilisateur.html — Édition profil utilisateur
[ ] admin/modifier_profil.html      — Mon profil (pour l'utilisateur connecté)
[ ] admin/admin_chauffeurs.html     — Liste chauffeurs + validation inscriptions
[ ] admin/modifier_chauffeur.html   — Édition profil chauffeur

[ ] bp_admin.py  — CRUD utilisateurs, validation chauffeurs
[ ] Upload photo de profil (Flask + chemin static/images/avatars/)
```

### PHASE 7 — Espace Chauffeur
```
[ ] chauffeur/chauffeur_dashboard.html    — Résumé courses, km, ponctualité
[ ] chauffeur/chauffeur_courses.html      — Historique des courses
[ ] chauffeur/chauffeur_stats.html        — Statistiques personnelles
[ ] chauffeur/chauffeur_maintenance.html  — Suivi maintenance véhicule
[ ] chauffeur/chauffeur_profil.html       — Voir son profil
[ ] chauffeur/chauffeur_modifier_profil.html — Modifier profil + photo

[ ] bp_chauffeur.py  — Routes espace chauffeur (login_required chauffeur)
```

### PHASE 8 — Cartographie
```
[ ] admin/admin_carte.html          — Vue carte de tous les véhicules/chauffeurs
[ ] admin/admin_localisation.html   — Paramètres de localisation
[ ] chauffeur/chauffeur_carte.html  — Sa propre localisation
[ ] public/localisation.html        — Agences sur carte (public)
[ ] components/carte_mini.html      — Composant carte réutilisable

[ ] js/modules/carte.js             — Leaflet.js init + marqueurs
[ ] js/modules/localisation.js      — Mise à jour position GPS (navigator.geolocation)
[ ] bp_api.py route /api/position   — Réception et stockage des positions
```

### PHASE 9 — Rapports & Notifications
```
[ ] admin/admin_rapports.html   — Interface génération rapports
[ ] admin/admin_avis.html       — Gestion des avis clients

[ ] bp_rapports.py              — Routes génération PDF
[ ] services/rapport_service.py — Logique génération WeasyPrint
[ ] services/notif_service.py   — Envoi email (Flask-Mail) + WhatsApp (Twilio/pywhatkit)
```

### PHASE 10 — API REST
```
[ ] bp_api.py  — Endpoints JSON pour :
    GET  /api/kpis          → KPIs du jour
    GET  /api/alertes        → Alertes actives
    POST /api/position       → Position GPS chauffeur
    GET  /api/vehicules      → État flotte
```

---

## 🏗️ Comment ajouter un nouveau module

### 1. Créer le blueprint

```python
# app/blueprints/bp_monmodule.py
from flask import Blueprint, render_template
from flask_login import login_required, current_user
from app.utils.decorators import role_required

bp_monmodule = Blueprint('monmodule', __name__)

@bp_monmodule.route('/')
@login_required
@role_required(niveau_min=2)   # superviseur et au-dessus
def index():
    # Récupérer les données
    data = {}
    return render_template('admin/admin_monmodule.html', **data)
```

### 2. Enregistrer dans app/__init__.py

```python
from app.blueprints.bp_monmodule import bp_monmodule
app.register_blueprint(bp_monmodule, url_prefix='/monmodule')
```

### 3. Créer le template

```html
<!-- app/templates/admin/admin_monmodule.html -->
{% extends "base/base_admin.html" %}
{% block title %}Mon Module{% endblock %}
{% block page_css %}
<link rel="stylesheet" href="{{ url_for('static', filename='css/pages/monmodule.css') }}">
{% endblock %}

{% block content %}
<div class="page-header">
    <h1>Mon Module</h1>
</div>
<!-- Contenu ici -->
{% endblock %}

{% block page_js %}
<script src="{{ url_for('static', filename='js/modules/monmodule.js') }}"></script>
{% endblock %}
```

### 4. Ajouter les fichiers CSS/JS

```
app/static/css/pages/monmodule.css
app/static/js/modules/monmodule.js
```

---

## 🔒 Décorateurs de sécurité à implémenter

```python
# app/utils/decorators.py

from functools import wraps
from flask import abort
from flask_login import current_user

def role_required(niveau_min):
    """Restreint l'accès aux utilisateurs ayant un niveau >= niveau_min."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not current_user.is_authenticated:
                abort(401)
            if not hasattr(current_user, 'niveau'):
                abort(403)
            if current_user.niveau() < niveau_min:
                abort(403)
            return f(*args, **kwargs)
        return decorated
    return decorator

def chauffeur_required(f):
    """Réserve la route aux chauffeurs authentifiés et validés."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated:
            abort(401)
        if not hasattr(current_user, 'statut_inscription'):
            abort(403)   # Ce n'est pas un chauffeur
        if not current_user.actif:
            abort(403)   # Compte non validé
        return f(*args, **kwargs)
    return decorated
```

---

## 📁 Conventions de nommage

| Élément | Convention | Exemple |
| :--- | :--- | :--- |
| Blueprint | `bp_<module>.py` | `bp_flotte.py` |
| Objet Blueprint | `bp_<module>` | `bp_flotte` |
| Template admin | `admin_<module>.html` | `admin_flotte.html` |
| Template chauffeur | `chauffeur_<page>.html` | `chauffeur_stats.html` |
| CSS page | `<module>.css` | `flotte.css` |
| JS module | `<module>.js` | `flotte.js` |
| Modèle SQLAlchemy | `PascalCase` | `CourseChauffeur` |
| Table BDD | `snake_case pluriel` | `courses_chauffeurs` |
| Route Flask | `snake_case` | `@bp_flotte.route('/detail/<int:id>')` |

---

## 🐛 Points d'attention

**Auth duale (Admin vs Chauffeur)**
Le `user_loader` de Flask-Login distingue les deux types via le préfixe `c-` :
```python
# utilisateur.py — load_user()
if str(user_id).startswith('c-'):
    return db.session.get(Chauffeur, int(user_id[2:]))
return db.session.get(Utilisateur, int(user_id))
```
Ne jamais mélanger les sessions — chaque espace a son propre login.

**Format téléphone**
Toujours normaliser avant de chercher en BDD :
```python
def normaliser_telephone(tel):
    tel = tel.strip().replace(' ', '')
    if tel.startswith('237') and not tel.startswith('+'):
        tel = '+' + tel
    elif len(tel) == 9 and tel[0] in '6789':
        tel = '+237' + tel
    return tel
```

**Upload photos**
Toujours valider l'extension et renommer le fichier côté serveur :
```python
import uuid, os
def save_photo(file, folder):
    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    file.save(os.path.join(folder, filename))
    return filename
```

---

## 📦 Dépendances à installer

```bash
pip install flask flask-sqlalchemy flask-login flask-wtf werkzeug
pip install weasyprint          # Génération PDF
pip install flask-mail          # Envoi email
pip install pillow              # Traitement images (photos de profil)
pip install python-dotenv       # Variables d'environnement
```

`requirements.txt` à maintenir à jour après chaque `pip install`.

---

*Guide mis à jour au : Avril 2026*  
*Développeur référent : Masse Masse Paul-Basthylle (Informatique)*  
*Encadreur : Dr. Prosper — ESTLC*
