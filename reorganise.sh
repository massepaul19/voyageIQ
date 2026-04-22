#!/bin/bash
# ============================================================
#  VoyageIQ-Pro — Réorganisation complète du projet
#  Blueprints fusionnés + Static enrichi + Templates complétés
#  Usage   : bash reorganise.sh
#  Depuis  : racine du projet VoyageIQ-Pro
# ============================================================

set -e

APP="app"
BLUE="$APP/blueprints"
STATIC="$APP/static"
TDIR="$APP/templates"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  VoyageIQ-Pro — Réorganisation complète"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"


# ╔══════════════════════════════════════════════════════════╗
# ║  1. BLUEPRINTS — fusion en fichiers plats               ║
# ╚══════════════════════════════════════════════════════════╝
echo ""
echo "📦 [1/3] Réorganisation des blueprints..."

# Sauvegarde
BACKUP="app/blueprints_backup_$(date +%Y%m%d_%H%M%S)"
cp -r "$BLUE" "$BACKUP"
echo "    Sauvegarde → $BACKUP"

# Supprimer les sous-dossiers inutiles, garder seulement les routes.py
# On va créer un dossier flat : blueprints/
# Chaque module = un seul fichier bp_<module>.py

mkdir -p "$BLUE"

# Liste des modules existants + nouveaux
MODULES=(
    admin
    alertes
    analytique
    api
    auth
    chauffeur
    clientele
    dashboard
    finance
    flotte
    lignes
    operations
    public
    rapports
    saisie
)

for mod in "${MODULES[@]}"; do
    TARGET="$BLUE/bp_${mod}.py"
    SRC_ROUTES="$BLUE/$mod/routes.py"

    if [ -f "$SRC_ROUTES" ]; then
        # Récupérer le contenu existant
        cp "$SRC_ROUTES" "$TARGET"
        echo "    ✓ bp_${mod}.py  (depuis $mod/routes.py)"
    else
        # Créer un fichier squelette propre
        cat > "$TARGET" << PYEOF
from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user

bp_${mod} = Blueprint('${mod}', __name__)


# ── Routes à implémenter ──────────────────────────────────────

PYEOF
        echo "    + bp_${mod}.py  (squelette créé)"
    fi
done

# Supprimer les anciens sous-dossiers de blueprints
for mod in "${MODULES[@]}"; do
    if [ -d "$BLUE/$mod" ]; then
        rm -rf "$BLUE/$mod"
    fi
done

# Réécrire le __init__.py des blueprints
cat > "$BLUE/__init__.py" << 'PYEOF'
"""
Blueprints VoyageIQ-Pro
Chaque module = un fichier bp_<module>.py
"""
from app.blueprints.bp_admin      import bp_admin
from app.blueprints.bp_alertes    import bp_alertes
from app.blueprints.bp_analytique import bp_analytique
from app.blueprints.bp_api        import bp_api
from app.blueprints.bp_auth       import bp_auth
from app.blueprints.bp_chauffeur  import bp_chauffeur
from app.blueprints.bp_clientele  import bp_clientele
from app.blueprints.bp_dashboard  import bp_dashboard
from app.blueprints.bp_finance    import bp_finance
from app.blueprints.bp_flotte     import bp_flotte
from app.blueprints.bp_lignes     import bp_lignes
from app.blueprints.bp_operations import bp_operations
from app.blueprints.bp_public     import bp_public
from app.blueprints.bp_rapports   import bp_rapports
from app.blueprints.bp_saisie     import bp_saisie

ALL_BLUEPRINTS = [
    (bp_public,     ''),
    (bp_auth,       '/auth'),
    (bp_dashboard,  '/dashboard'),
    (bp_admin,      '/admin'),
    (bp_chauffeur,  '/chauffeur'),
    (bp_saisie,     '/saisie'),
    (bp_flotte,     '/flotte'),
    (bp_lignes,     '/lignes'),
    (bp_finance,    '/finance'),
    (bp_operations, '/operations'),
    (bp_clientele,  '/clientele'),
    (bp_analytique, '/analytique'),
    (bp_alertes,    '/alertes'),
    (bp_rapports,   '/rapports'),
    (bp_api,        '/api'),
]
PYEOF
echo "    ✓ __init__.py mis à jour"


# ╔══════════════════════════════════════════════════════════╗
# ║  2. STATIC — CSS + JS enrichis                          ║
# ╚══════════════════════════════════════════════════════════╝
echo ""
echo "🎨 [2/3] Enrichissement de static/..."

# ── CSS pages manquantes ──────────────────────────────────
CSS_PAGES=(
    admin
    alertes
    analytique
    chauffeur
    clientele
    dashboard
    finance
    flotte
    lignes
    login
    operations
    public
    rapports
    saisie
    carte
    localisation
)

for f in "${CSS_PAGES[@]}"; do
    FILE="$STATIC/css/pages/${f}.css"
    if [ ! -f "$FILE" ]; then
        cat > "$FILE" << CSSEOF
/* ── VoyageIQ-Pro — Page : ${f} ─────────────────────────────
   Styles spécifiques à la page ${f}
   Importé via base_admin.html ou base_public.html
──────────────────────────────────────────────────────────── */

CSSEOF
        echo "    + css/pages/${f}.css"
    else
        echo "    ✓ css/pages/${f}.css  (existe déjà)"
    fi
done

# ── CSS components manquants ─────────────────────────────
CSS_COMPONENTS=(
    alerts
    buttons
    cards
    chauffeur_nav
    footer
    forms
    kpi
    modals
    navbar
    sidebar
    tables
)

for f in "${CSS_COMPONENTS[@]}"; do
    FILE="$STATIC/css/components/${f}.css"
    if [ ! -f "$FILE" ]; then
        cat > "$FILE" << CSSEOF
/* ── VoyageIQ-Pro — Composant : ${f} ───────────────────────
   Styles du composant réutilisable : ${f}
──────────────────────────────────────────────────────────── */

CSSEOF
        echo "    + css/components/${f}.css"
    else
        echo "    ✓ css/components/${f}.css  (existe déjà)"
    fi
done

# ── CSS base manquants ────────────────────────────────────
CSS_BASE=(main reset variables animations)
for f in "${CSS_BASE[@]}"; do
    FILE="$STATIC/css/base/${f}.css"
    if [ ! -f "$FILE" ]; then
        touch "$FILE"
        echo "    + css/base/${f}.css"
    else
        echo "    ✓ css/base/${f}.css  (existe déjà)"
    fi
done

# ── JS modules manquants ──────────────────────────────────
JS_MODULES=(
    admin
    alertes
    analytique
    carte
    chauffeur
    clientele
    dashboard
    finance
    flotte
    lignes
    localisation
    operations
    public
    rapports
    saisie
)

for f in "${JS_MODULES[@]}"; do
    FILE="$STATIC/js/modules/${f}.js"
    if [ ! -f "$FILE" ]; then
        cat > "$FILE" << JSEOF
/* ── VoyageIQ-Pro — Module JS : ${f} ───────────────────────
   Logique front-end spécifique au module : ${f}
──────────────────────────────────────────────────────────── */

'use strict';

JSEOF
        echo "    + js/modules/${f}.js"
    else
        echo "    ✓ js/modules/${f}.js  (existe déjà)"
    fi
done

# ── Dossiers images ───────────────────────────────────────
mkdir -p "$STATIC/images/logos"
mkdir -p "$STATIC/images/vehicules"
mkdir -p "$STATIC/images/chauffeurs"
mkdir -p "$STATIC/images/avatars"
mkdir -p "$STATIC/images/icons"
echo "    ✓ images/ (logos, vehicules, chauffeurs, avatars, icons)"

# ── Fonts (placeholder) ───────────────────────────────────
mkdir -p "$STATIC/fonts"
touch "$STATIC/fonts/.gitkeep"
echo "    + fonts/"


# ╔══════════════════════════════════════════════════════════╗
# ║  3. TEMPLATES — pages manquantes                        ║
# ╚══════════════════════════════════════════════════════════╝
echo ""
echo "🖼️  [3/3] Complétion des templates..."

# ── Admin ─────────────────────────────────────────────────
ADMIN_PAGES=(
    admin_alertes
    admin_analytique
    admin_avis
    admin_carte
    admin_chauffeurs
    admin_clientele
    admin_dashboard
    admin_finance
    admin_flotte
    admin_lignes
    admin_localisation
    admin_operations
    admin_rapports
    admin_saisie
    admin_utilisateurs
    modifier_chauffeur
    modifier_profil
    modifier_utilisateur
    modifier_vehicule
)
for f in "${ADMIN_PAGES[@]}"; do
    FILE="$TDIR/admin/${f}.html"
    [ ! -f "$FILE" ] && touch "$FILE" && echo "    + admin/${f}.html"
done

# ── Chauffeur ─────────────────────────────────────────────
CHAUFFEUR_PAGES=(
    chauffeur_carte
    chauffeur_courses
    chauffeur_dashboard
    chauffeur_inscription
    chauffeur_inscription_attente
    chauffeur_localisation
    chauffeur_login
    chauffeur_maintenance
    chauffeur_modifier_profil
    chauffeur_profil
    chauffeur_stats
)
for f in "${CHAUFFEUR_PAGES[@]}"; do
    FILE="$TDIR/chauffeur/${f}.html"
    [ ! -f "$FILE" ] && touch "$FILE" && echo "    + chauffeur/${f}.html"
done

# ── Public ────────────────────────────────────────────────
PUBLIC_PAGES=(about contact index localisation)
for f in "${PUBLIC_PAGES[@]}"; do
    FILE="$TDIR/public/${f}.html"
    [ ! -f "$FILE" ] && touch "$FILE" && echo "    + public/${f}.html"
done

# ── Components ────────────────────────────────────────────
COMPONENTS=(alerte_card carte_mini course_card kpi_card nav_chauffeur pagination)
for f in "${COMPONENTS[@]}"; do
    FILE="$TDIR/components/${f}.html"
    [ ! -f "$FILE" ] && touch "$FILE" && echo "    + components/${f}.html"
done

# ── Base ──────────────────────────────────────────────────
for f in base_admin base_chauffeur base_public; do
    FILE="$TDIR/base/${f}.html"
    [ ! -f "$FILE" ] && touch "$FILE" && echo "    + base/${f}.html"
done


# ╔══════════════════════════════════════════════════════════╗
# ║  RÉSULTAT FINAL                                         ║
# ╚══════════════════════════════════════════════════════════╝
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Réorganisation terminée !"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📂 Nouvelle structure :"
echo ""
tree "$APP/blueprints" --noreport -I '__pycache__|*.pyc|*_backup_*'
echo ""
tree "$STATIC" --noreport -I '__pycache__|*.pyc'
echo ""
tree "$TDIR" --noreport
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 Prochaines étapes :"
echo "   1. Mettre à jour app/__init__.py pour enregistrer"
echo "      les blueprints via ALL_BLUEPRINTS"
echo "   2. Adapter les imports dans chaque bp_<module>.py"
echo "      (Blueprint name changé en 'module')"
echo "   3. Lancer : python database/seeds/init_db.py"
echo "   4. Tester  : python run.py"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
