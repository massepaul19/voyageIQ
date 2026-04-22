"""
VoyageIQ-Pro — Initialisation de la base de données
=====================================================
- Crée toutes les tables (SQLAlchemy)
- Insère les utilisateurs admin réels (auth par téléphone)
- Insère des chauffeurs démo
- Insère les lignes et véhicules de démonstration

Usage :
    python database/seeds/init_db.py
    python database/seeds/init_db.py --reset   # supprime et recrée tout
"""

import sys, os, argparse
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app import create_app
from app.extensions import db
from app.models.utilisateur import Utilisateur
from app.models.chauffeur   import Chauffeur, CourseChauffeur
from app.models.ligne        import Ligne
from app.models.vehicule     import Vehicule
from datetime import date, datetime, timezone

# ─────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument('--reset', action='store_true', help='Supprime et recrée toutes les tables')
args = parser.parse_args()

app = create_app()

with app.app_context():

    if args.reset:
        print("⚠️  Suppression de toutes les tables...")
        db.drop_all()
        print("✓ Tables supprimées")

    db.create_all()
    print("✓ Tables créées / vérifiées")

    # ══════════════════════════════════════════════════════════
    #  UTILISATEURS (auth par téléphone + mot de passe)
    #  Format téléphone accepté : +237XXXXXXXXX ou XXXXXXXXX
    # ══════════════════════════════════════════════════════════
    print("\n── Utilisateurs ─────────────────────────────────────")

    utilisateurs = [
        # ── Admin système ──
        {
            'identifiant':  'admin',
            'nom':          'Administrateur',
            'prenom':       'Système',
            'matricule':    'VIQ-ADM-001',
            'role':         'admin',
            'agence':       'Système',
            'telephone':    '+237690000001',
            'telephone_whatsapp': '+237690000001',
            'email':        'admin@voyageiq.cm',
            'pwd':          'Admin@VIQ2026',
            'notif_email':  True,
            'notif_whatsapp': True,
        },
        # ── Direction Générale ──
        {
            'identifiant':  'dg.mbarga',
            'nom':          'Mbarga',
            'prenom':       'Jean-Pierre',
            'matricule':    'VIQ-DG-001',
            'role':         'dg',
            'agence':       'Direction Générale',
            'telephone':    '+237677000010',
            'telephone_whatsapp': '+237677000010',
            'email':        'jp.mbarga@voyageiq.cm',
            'pwd':          'DG@VIQ2026',
            'notif_email':  True,
            'notif_whatsapp': True,
        },
        {
            'identifiant':  'dg.onana',
            'nom':          'Onana',
            'prenom':       'Marie-Claire',
            'matricule':    'VIQ-DG-002',
            'role':         'dg',
            'agence':       'Direction Générale',
            'telephone':    '+237699000020',
            'telephone_whatsapp': '+237699000020',
            'email':        'mc.onana@voyageiq.cm',
            'pwd':          'DG2@VIQ2026',
            'notif_email':  True,
            'notif_whatsapp': False,
        },
        # ── Chefs d'Agence ──
        {
            'identifiant':  'chef.yaounde',
            'nom':          'Biyong',
            'prenom':       'Paul',
            'matricule':    'VIQ-CA-001',
            'role':         'chef',
            'agence':       'Yaoundé',
            'telephone':    '+237655000100',
            'telephone_whatsapp': '+237655000100',
            'email':        'p.biyong@voyageiq.cm',
            'pwd':          'Chef1@VIQ2026',
            'notif_email':  True,
            'notif_whatsapp': True,
        },
        {
            'identifiant':  'chef.douala',
            'nom':          'Ngom',
            'prenom':       'Bertrand',
            'matricule':    'VIQ-CA-002',
            'role':         'chef',
            'agence':       'Douala',
            'telephone':    '+237666000200',
            'telephone_whatsapp': '+237666000200',
            'email':        'b.ngom@voyageiq.cm',
            'pwd':          'Chef2@VIQ2026',
            'notif_email':  True,
            'notif_whatsapp': True,
        },
        {
            'identifiant':  'chef.bafoussam',
            'nom':          'Feudjio',
            'prenom':       'Armand',
            'matricule':    'VIQ-CA-003',
            'role':         'chef',
            'agence':       'Bafoussam',
            'telephone':    '+237677000300',
            'telephone_whatsapp': '+237677000300',
            'email':        'a.feudjio@voyageiq.cm',
            'pwd':          'Chef3@VIQ2026',
            'notif_email':  True,
            'notif_whatsapp': False,
        },
        # ── Superviseurs terrain ──
        {
            'identifiant':  'sup.yaounde',
            'nom':          'Ateba',
            'prenom':       'Rodrigue',
            'matricule':    'VIQ-SUP-001',
            'role':         'superviseur',
            'agence':       'Yaoundé',
            'telephone':    '+237655001001',
            'telephone_whatsapp': '+237655001001',
            'email':        'r.ateba@voyageiq.cm',
            'pwd':          'Sup1@VIQ2026',
            'notif_email':  False,
            'notif_whatsapp': True,
        },
        {
            'identifiant':  'sup.douala',
            'nom':          'Ekwalla',
            'prenom':       'Sylvie',
            'matricule':    'VIQ-SUP-002',
            'role':         'superviseur',
            'agence':       'Douala',
            'telephone':    '+237699001002',
            'telephone_whatsapp': '+237699001002',
            'email':        's.ekwalla@voyageiq.cm',
            'pwd':          'Sup2@VIQ2026',
            'notif_email':  False,
            'notif_whatsapp': True,
        },
        # ── Auditeurs ──
        {
            'identifiant':  'audit.nkolo',
            'nom':          'Nkolo',
            'prenom':       'Francis',
            'matricule':    'VIQ-AUD-001',
            'role':         'auditeur',
            'agence':       'Direction Générale',
            'telephone':    '+237677002001',
            'telephone_whatsapp': None,
            'email':        'f.nkolo@voyageiq.cm',
            'pwd':          'Audit1@VIQ2026',
            'notif_email':  True,
            'notif_whatsapp': False,
        },
    ]

    for u in utilisateurs:
        if not Utilisateur.query.filter_by(identifiant=u['identifiant']).first():
            user = Utilisateur(
                identifiant         = u['identifiant'],
                nom                 = u['nom'],
                prenom              = u.get('prenom'),
                matricule           = u.get('matricule'),
                role                = u['role'],
                agence              = u.get('agence'),
                telephone           = u.get('telephone'),
                telephone_whatsapp  = u.get('telephone_whatsapp'),
                email               = u.get('email'),
                notif_email         = u.get('notif_email', True),
                notif_whatsapp      = u.get('notif_whatsapp', False),
            )
            user.set_password(u['pwd'])
            db.session.add(user)
            print(f"    + {u['prenom']} {u['nom']} [{u['role']}] — {u['telephone']}")
        else:
            print(f"    ✓ {u['identifiant']} existe déjà")

    db.session.commit()
    print("✓ Utilisateurs enregistrés")

    # ══════════════════════════════════════════════════════════
    #  LIGNES DE TRANSPORT
    # ══════════════════════════════════════════════════════════
    print("\n── Lignes ───────────────────────────────────────────")

    lignes_data = [
        {'code': 'L01', 'nom': 'Yaoundé — Douala',    'depart': 'Yaoundé',    'arrivee': 'Douala',    'km': 250, 'tarif': 3500, 'frequence': 8,  'couleur': '#C9A84C'},
        {'code': 'L02', 'nom': 'Yaoundé — Bafoussam', 'depart': 'Yaoundé',    'arrivee': 'Bafoussam', 'km': 310, 'tarif': 4000, 'frequence': 6,  'couleur': '#A07830'},
        {'code': 'L03', 'nom': 'Douala — Kribi',      'depart': 'Douala',     'arrivee': 'Kribi',     'km': 195, 'tarif': 2500, 'frequence': 5,  'couleur': '#E8C96A'},
        {'code': 'L04', 'nom': 'Yaoundé — Bertoua',   'depart': 'Yaoundé',    'arrivee': 'Bertoua',   'km': 350, 'tarif': 4500, 'frequence': 4,  'couleur': '#6B5520'},
        {'code': 'L05', 'nom': 'Douala — Bafoussam',  'depart': 'Douala',     'arrivee': 'Bafoussam', 'km': 375, 'tarif': 4500, 'frequence': 4,  'couleur': '#8A7040'},
        {'code': 'L06', 'nom': 'Yaoundé — Ebolowa',   'depart': 'Yaoundé',    'arrivee': 'Ebolowa',   'km': 160, 'tarif': 2000, 'frequence': 4,  'couleur': '#5A8A40'},
        {'code': 'L07', 'nom': 'Douala — Limbé',      'depart': 'Douala',     'arrivee': 'Limbé',     'km': 70,  'tarif': 1000, 'frequence': 10, 'couleur': '#4080A0'},
    ]

    for l in lignes_data:
        if not Ligne.query.filter_by(code=l['code']).first():
            db.session.add(Ligne(**l))
            print(f"    + {l['code']} : {l['nom']}")
        else:
            print(f"    ✓ {l['code']} existe déjà")

    db.session.commit()
    print("✓ Lignes enregistrées")

    # ══════════════════════════════════════════════════════════
    #  VÉHICULES
    # ══════════════════════════════════════════════════════════
    print("\n── Véhicules ────────────────────────────────────────")

    l01 = Ligne.query.filter_by(code='L01').first()
    l02 = Ligne.query.filter_by(code='L02').first()
    l03 = Ligne.query.filter_by(code='L03').first()
    l07 = Ligne.query.filter_by(code='L07').first()

    vehicules_data = [
        {'plaque': 'LT-2341-A', 'modele': 'Toyota Hiace 2019',      'capacite': 16, 'ligne': l01, 'km_actuel': 48500, 'km_maintenance': 50000, 'exp_vt': '2026-08-15', 'exp_assurance': '2026-06-30', 'statut': 'operationnel'},
        {'plaque': 'LT-3892-B', 'modele': 'Toyota Hiace 2020',      'capacite': 16, 'ligne': l01, 'km_actuel': 32100, 'km_maintenance': 40000, 'exp_vt': '2026-11-20', 'exp_assurance': '2026-09-15', 'statut': 'operationnel'},
        {'plaque': 'LT-5514-C', 'modele': 'Mercedes Sprinter 2018', 'capacite': 19, 'ligne': l02, 'km_actuel': 72300, 'km_maintenance': 75000, 'exp_vt': '2026-04-30', 'exp_assurance': '2026-05-20', 'statut': 'maintenance'},
        {'plaque': 'LT-7832-D', 'modele': 'Toyota Hiace 2021',      'capacite': 16, 'ligne': l02, 'km_actuel': 18700, 'km_maintenance': 30000, 'exp_vt': '2026-12-10', 'exp_assurance': '2026-10-25', 'statut': 'operationnel'},
        {'plaque': 'LT-9103-E', 'modele': 'Ford Transit 2020',      'capacite': 14, 'ligne': None,'km_actuel': 55200, 'km_maintenance': 60000, 'exp_vt': '2026-07-08', 'exp_assurance': '2026-07-15', 'statut': 'operationnel'},
        {'plaque': 'LT-1205-F', 'modele': 'Toyota Hiace 2022',      'capacite': 16, 'ligne': l03, 'km_actuel': 12400, 'km_maintenance': 30000, 'exp_vt': '2027-01-15', 'exp_assurance': '2026-12-31', 'statut': 'operationnel'},
        {'plaque': 'LT-4471-G', 'modele': 'Coaster 2019',           'capacite': 29, 'ligne': l07, 'km_actuel': 61000, 'km_maintenance': 70000, 'exp_vt': '2026-06-01', 'exp_assurance': '2026-08-10', 'statut': 'operationnel'},
        {'plaque': 'LT-8820-H', 'modele': 'Toyota Hiace 2018',      'capacite': 16, 'ligne': None,'km_actuel': 88200, 'km_maintenance': 90000, 'exp_vt': '2026-03-01', 'exp_assurance': '2026-04-01', 'statut': 'panne'},
    ]

    for v in vehicules_data:
        if not Vehicule.query.filter_by(plaque=v['plaque']).first():
            veh = Vehicule(
                plaque          = v['plaque'],
                modele          = v['modele'],
                capacite        = v['capacite'],
                ligne_id        = v['ligne'].id if v.get('ligne') else None,
                km_actuel       = v['km_actuel'],
                km_maintenance  = v['km_maintenance'],
                exp_vt          = date.fromisoformat(v['exp_vt']),
                exp_assurance   = date.fromisoformat(v['exp_assurance']),
                statut          = v['statut'],
            )
            db.session.add(veh)
            print(f"    + {v['plaque']} — {v['modele']} [{v['statut']}]")
        else:
            print(f"    ✓ {v['plaque']} existe déjà")

    db.session.commit()
    print("✓ Véhicules enregistrés")

    # ══════════════════════════════════════════════════════════
    #  CHAUFFEURS DÉMO
    #  Auth par téléphone + mot de passe
    #  Statut : en_attente → admin valide
    # ══════════════════════════════════════════════════════════
    print("\n── Chauffeurs ───────────────────────────────────────")

    admin_user = Utilisateur.query.filter_by(identifiant='admin').first()
    l01 = Ligne.query.filter_by(code='L01').first()
    l02 = Ligne.query.filter_by(code='L02').first()

    chauffeurs_data = [
        {
            'username':       'c.tsafack',
            'nom':            'Tsafack',
            'prenom':         'Hervé',
            'telephone':      '+237677100001',
            'email':          'h.tsafack@voyageiq.cm',
            'num_permis':     'CM-B-2019-00412',
            'categorie_permis': 'B',
            'exp_permis':     '2027-03-15',
            'num_cni':        '123456789',
            'annees_exp':     7,
            'agence':         'Yaoundé',
            'ligne_id':       l01.id if l01 else None,
            'statut_inscription': 'valide',
            'actif':          True,
            'pwd':            'Chauf1@VIQ2026',
        },
        {
            'username':       'c.nganou',
            'nom':            'Nganou',
            'prenom':         'Alphonse',
            'telephone':      '+237655100002',
            'email':          'a.nganou@voyageiq.cm',
            'num_permis':     'CM-B-2017-00198',
            'categorie_permis': 'B',
            'exp_permis':     '2026-08-20',
            'num_cni':        '987654321',
            'annees_exp':     9,
            'agence':         'Douala',
            'ligne_id':       l01.id if l01 else None,
            'statut_inscription': 'valide',
            'actif':          True,
            'pwd':            'Chauf2@VIQ2026',
        },
        {
            'username':       'c.kamga',
            'nom':            'Kamga',
            'prenom':         'Rodrigue',
            'telephone':      '+237699100003',
            'email':          'r.kamga@voyageiq.cm',
            'num_permis':     'CM-D-2020-00763',
            'categorie_permis': 'D',
            'exp_permis':     '2028-01-10',
            'num_cni':        '456789123',
            'annees_exp':     4,
            'agence':         'Bafoussam',
            'ligne_id':       l02.id if l02 else None,
            'statut_inscription': 'valide',
            'actif':          True,
            'pwd':            'Chauf3@VIQ2026',
        },
        {
            # Inscription en attente de validation
            'username':       'c.fouda',
            'nom':            'Fouda',
            'prenom':         'Serge',
            'telephone':      '+237677200004',
            'email':          'serge.fouda@gmail.com',
            'num_permis':     'CM-B-2021-01045',
            'categorie_permis': 'B',
            'exp_permis':     '2029-06-01',
            'num_cni':        '321654987',
            'annees_exp':     2,
            'agence':         'Yaoundé',
            'ligne_id':       None,
            'statut_inscription': 'en_attente',
            'actif':          False,
            'pwd':            'Fouda@2026',
        },
    ]

    for c in chauffeurs_data:
        if not Chauffeur.query.filter_by(username=c['username']).first():
            # Générer matricule pour les validés
            mat = None
            if c['statut_inscription'] == 'valide':
                count = Chauffeur.query.filter_by(statut_inscription='valide').count()
                mat = f"VIQ-CHF-{str(count + 1).zfill(3)}"

            chauf = Chauffeur(
                username            = c['username'],
                nom                 = c['nom'],
                prenom              = c['prenom'],
                matricule           = mat,
                telephone           = c['telephone'],
                email               = c.get('email'),
                num_permis          = c.get('num_permis'),
                categorie_permis    = c.get('categorie_permis'),
                exp_permis          = date.fromisoformat(c['exp_permis']) if c.get('exp_permis') else None,
                num_cni             = c.get('num_cni'),
                annees_exp          = c.get('annees_exp', 0),
                agence              = c.get('agence'),
                ligne_preferee      = c.get('ligne_id'),
                statut_inscription  = c['statut_inscription'],
                actif               = c['actif'],
                validated_by        = admin_user.id if c['actif'] and admin_user else None,
                validated_at        = datetime.now(timezone.utc) if c['actif'] else None,
            )
            chauf.set_password(c['pwd'])
            db.session.add(chauf)
            print(f"    + {c['prenom']} {c['nom']} [{c['statut_inscription']}] — {c['telephone']}")
        else:
            print(f"    ✓ {c['username']} existe déjà")

    db.session.commit()
    print("✓ Chauffeurs enregistrés")

    # ══════════════════════════════════════════════════════════
    #  RÉSUMÉ FINAL
    # ══════════════════════════════════════════════════════════
    print()
    print("╔══════════════════════════════════════════════════════════╗")
    print("║         VoyageIQ-Pro — Base initialisée ✅               ║")
    print("╠══════════════════════════════════════════════════════════╣")
    print("║  ACCÈS ADMINISTRATEURS (téléphone + mot de passe)        ║")
    print("╠══════════════════════════════════════════════════════════╣")
    print("║  +237690000001   Admin@VIQ2026     [Admin]               ║")
    print("║  +237677000010   DG@VIQ2026        [DG - Mbarga]         ║")
    print("║  +237655000100   Chef1@VIQ2026     [Chef - Yaoundé]      ║")
    print("║  +237666000200   Chef2@VIQ2026     [Chef - Douala]       ║")
    print("║  +237655001001   Sup1@VIQ2026      [Superviseur - Yde]   ║")
    print("║  +237677002001   Audit1@VIQ2026    [Auditeur]            ║")
    print("╠══════════════════════════════════════════════════════════╣")
    print("║  ACCÈS CHAUFFEURS (téléphone + mot de passe)             ║")
    print("╠══════════════════════════════════════════════════════════╣")
    print("║  +237677100001   Chauf1@VIQ2026    [Tsafack Hervé]       ║")
    print("║  +237655100002   Chauf2@VIQ2026    [Nganou Alphonse]     ║")
    print("║  +237699100003   Chauf3@VIQ2026    [Kamga Rodrigue]      ║")
    print("║  +237677200004   Fouda@2026        [en attente valid.]   ║")
    print("╠══════════════════════════════════════════════════════════╣")
    print(f"║  Lignes : {Ligne.query.count():<3}   Véhicules : {Vehicule.query.count():<3}                          ║")
    print("╚══════════════════════════════════════════════════════════╝")
