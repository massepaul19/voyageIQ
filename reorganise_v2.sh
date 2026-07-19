#!/usr/bin/env bash
# reorganise_v2.sh — sépare VoyageIQ Pro en backend/ et frontend/
# Convention retenue : blueprints/ + bp_*.py conservés, run.py reste à la racine.
#
# Usage :
#   ./reorganise_v2.sh --dry-run   # affiche ce qui serait fait, ne modifie rien
#   ./reorganise_v2.sh             # exécute réellement
set -euo pipefail
set +H   # évite les soucis d'history expansion (!) dans les one-liners

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "🔎 Mode dry-run — aucune modification ne sera faite"
fi

run() {
    echo "→ $*"
    if ! $DRY_RUN; then
        "$@"
    fi
}

# Sécurité : refuse de tourner si le dépôt a des modifs non commitées
if ! $DRY_RUN && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    if [[ -n "$(git status --porcelain)" ]]; then
        echo "❌ Le dépôt git a des modifications non commitées. Commit ou stash d'abord."
        exit 1
    fi
fi

echo "══════════════════════════════════════════════════"
echo "  Réorganisation VoyageIQ Pro → backend/ + frontend/"
echo "══════════════════════════════════════════════════"

# 1. Créer les dossiers cibles
run mkdir -p backend frontend

# 2. Déplacer le code backend (git mv préserve l'historique si dépôt git)
mv_cmd() {
    if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        run git mv "$1" "$2"
    else
        run mv "$1" "$2"
    fi
}

[[ -d app/blueprints ]]   && mv_cmd app/blueprints   backend/blueprints
[[ -d app/models ]]       && mv_cmd app/models       backend/models
[[ -d app/services ]]     && mv_cmd app/services     backend/services
[[ -d app/utils ]]        && mv_cmd app/utils        backend/utils
[[ -d app/extensions ]]   && mv_cmd app/extensions   backend/extensions
[[ -d config ]]           && mv_cmd config           backend/config
[[ -f app/__init__.py ]]  && mv_cmd app/__init__.py  backend/app_factory.py
[[ -f requirements.txt ]] && mv_cmd requirements.txt backend/requirements.txt

# 3. Migrations (Alembic, préparées pour la Phase 4 même si vide pour l'instant)
#    git ne suit pas les dossiers vides -> on gère ce cas à part.
if [[ -d database/migrations ]]; then
    if [[ -z "$(ls -A database/migrations 2>/dev/null)" ]]; then
        run mkdir -p backend/migrations
        run rmdir database/migrations
    else
        mv_cmd database/migrations backend/migrations
    fi
fi

# 4. Frontend
[[ -d app/templates ]] && mv_cmd app/templates frontend/templates
[[ -d app/static ]]    && mv_cmd app/static    frontend/static

# 5. Nettoyage du dossier app/ (garde ce qui resterait, ex: __pycache__)
if [[ -d app ]] && [[ -z "$(ls -A app 2>/dev/null | grep -v __pycache__)" ]]; then
    run rm -rf app
elif [[ -d app ]]; then
    echo "⚠️  app/ contient encore des fichiers non prévus — à vérifier manuellement :"
    ls -A app
fi

echo ""
echo "── Mise à jour des imports Python ──────────────────"

# 6. Remplacer "from app." / "import app." / "from app import" partout où
#    ça référence l'ancien package, y compris les imports indentés.
fix_imports() {
    local f="$1"
    if grep -qE '(^|[^.[:alnum:]_])(from[[:space:]]+app\.|import[[:space:]]+app\.|from[[:space:]]+app[[:space:]]+import|from[[:space:]]+config\.|import[[:space:]]+config\.)' "$f"; then
        run cp "$f" "$f.bak"
        if ! $DRY_RUN; then
            sed -i -E \
                -e 's/^([[:space:]]*)from app\./\1from backend./' \
                -e 's/^([[:space:]]*)import app\./\1import backend./' \
                -e 's/^([[:space:]]*)from app import create_app/\1from backend.app_factory import create_app/' \
                -e 's/^([[:space:]]*)from config\./\1from backend.config./' \
                -e 's/^([[:space:]]*)import config\./\1import backend.config./' \
                "$f"
        fi
        echo "  ✓ imports mis à jour : $f"
    fi
}

# Fichiers concernés : tout backend/, run.py, et database/seeds/ (référence app.*)
if [[ -d backend ]]; then
    find backend -name "*.py" -print0 | while IFS= read -r -d '' f; do
        fix_imports "$f"
    done
fi
[[ -f run.py ]] && fix_imports run.py
if [[ -d database/seeds ]]; then
    find database/seeds -name "*.py" -print0 | while IFS= read -r -d '' f; do
        fix_imports "$f"
    done
fi

echo ""
echo "── Vérification : occurrences restantes de l'ancien import ──"
if ! grep -rnE '(from[[:space:]]+app\.|from[[:space:]]+app[[:space:]]+import|^import[[:space:]]+app\b|from[[:space:]]+config\.|^import[[:space:]]+config\b)' \
        backend run.py database/seeds 2>/dev/null; then
    echo "  ✓ aucune occurrence restante"
fi

echo ""
echo "══════════════════════════════════════════════════"
echo "  ⚠️  Étapes manuelles restantes (pas automatisées) :"
echo "══════════════════════════════════════════════════"
cat << 'EOF'
  1. Dans backend/app_factory.py, configurer explicitement les chemins
     du template/static (Flask ne les trouvera plus par défaut, puisque
     ils ne sont plus à côté du package) :

       app = Flask(
           __name__,
           template_folder='../frontend/templates',
           static_folder='../frontend/static',
       )

  2. Vérifier backend/config/settings.py : tout chemin calculé à partir
     de __file__ (ex: BASE_DIR, DB_PATH) doit être revérifié, la
     profondeur de dossier a changé (config/ est maintenant sous backend/,
     donc un niveau de plus par rapport à la racine du projet).

  3. Vérifier backend/models/__init__.py et backend/blueprints/__init__.py
     s'ils font des imports relatifs qui référençaient "app".

  4. Tester le démarrage :
       python run.py

  5. Si tout fonctionne, supprimer les fichiers .bak et commit.
       find backend run.py database/seeds -name "*.bak" -delete
EOF
