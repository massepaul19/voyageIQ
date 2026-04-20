"""
Initialise la base de données avec :
  - les tables (SQLAlchemy)
  - les comptes utilisateurs de démo
  - quelques lignes et véhicules de démonstration
"""
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app import create_app
from app.extensions import db
from app.models.utilisateur import Utilisateur
from app.models.ligne import Ligne
from app.models.vehicule import Vehicule
from datetime import date

app = create_app()

with app.app_context():
    db.create_all()
    print("✓ Tables créées")

    # ── Utilisateurs démo ──
    demo_users = [
        {'id': 'admin',   'pwd': 'Admin@VIQ2026', 'role': 'admin',       'nom': 'Administrateur',        'agence': 'Système'},
        {'id': 'dg.01',   'pwd': 'DG@2026',       'role': 'dg',          'nom': 'Directeur Général 1',   'agence': '—'},
        {'id': 'dg.02',   'pwd': 'DG2@2026',      'role': 'dg',          'nom': 'Directeur Général 2',   'agence': '—'},
        {'id': 'chef.01', 'pwd': 'Chef1@2026',     'role': 'chef',        'nom': "Chef d'Agence 1",       'agence': 'Yaoundé'},
        {'id': 'chef.02', 'pwd': 'Chef2@2026',     'role': 'chef',        'nom': "Chef d'Agence 2",       'agence': 'Douala'},
        {'id': 'sup.01',  'pwd': 'Sup1@2026',      'role': 'superviseur', 'nom': 'Superviseur 1',         'agence': 'Yaoundé'},
        {'id': 'sup.02',  'pwd': 'Sup2@2026',      'role': 'superviseur', 'nom': 'Superviseur 2',         'agence': 'Douala'},
        {'id': 'audit.01','pwd': 'Audit1@2026',    'role': 'auditeur',    'nom': 'Auditeur 1',            'agence': '—'},
    ]
    for u in demo_users:
        if not Utilisateur.query.filter_by(identifiant=u['id']).first():
            user = Utilisateur(identifiant=u['id'], nom=u['nom'], role=u['role'], agence=u['agence'])
            user.set_password(u['pwd'])
            db.session.add(user)
    db.session.commit()
    print("✓ Utilisateurs démo créés")

    # ── Lignes de démonstration ──
    lignes_demo = [
        {'code':'L01','nom':'Yaoundé — Douala',    'dep':'Yaoundé',   'arr':'Douala',    'km':250,'tarif':3500,'freq':8,'color':'#C9A84C'},
        {'code':'L02','nom':'Yaoundé — Bafoussam', 'dep':'Yaoundé',   'arr':'Bafoussam', 'km':310,'tarif':4000,'freq':6,'color':'#A07830'},
        {'code':'L03','nom':'Douala — Kribi',      'dep':'Douala',    'arr':'Kribi',     'km':195,'tarif':2500,'freq':5,'color':'#E8C96A'},
        {'code':'L04','nom':'Yaoundé — Bertoua',   'dep':'Yaoundé',   'arr':'Bertoua',   'km':350,'tarif':4500,'freq':4,'color':'#6B5520'},
        {'code':'L05','nom':'Douala — Bafoussam',  'dep':'Douala',    'arr':'Bafoussam', 'km':375,'tarif':4500,'freq':4,'color':'#8A7040'},
    ]
    for l in lignes_demo:
        if not Ligne.query.filter_by(code=l['code']).first():
            ligne = Ligne(**l)
            db.session.add(ligne)
    db.session.commit()
    print("✓ Lignes démo créées")

    # ── Véhicules de démonstration ──
    l01 = Ligne.query.filter_by(code='L01').first()
    l02 = Ligne.query.filter_by(code='L02').first()
    veh_demo = [
        {'plaque':'LT-2341-A','modele':'Toyota Hiace 2019',      'cap':16,'ligne':l01,'km':48500,'km_m':50000,'vt':'2026-08-15','ass':'2026-06-30'},
        {'plaque':'LT-3892-B','modele':'Toyota Hiace 2020',      'cap':16,'ligne':l01,'km':32100,'km_m':40000,'vt':'2026-11-20','ass':'2026-09-15'},
        {'plaque':'LT-5514-C','modele':'Mercedes Sprinter 2018', 'cap':19,'ligne':l02,'km':72300,'km_m':75000,'vt':'2026-04-30','ass':'2026-05-20','st':'maintenance'},
        {'plaque':'LT-7832-D','modele':'Toyota Hiace 2021',      'cap':16,'ligne':l02,'km':18700,'km_m':30000,'vt':'2026-12-10','ass':'2026-10-25'},
        {'plaque':'LT-9103-E','modele':'Ford Transit 2020',      'cap':14,'ligne':None,'km':55200,'km_m':60000,'vt':'2026-07-08','ass':'2026-07-15'},
    ]
    for v in veh_demo:
        if not Vehicule.query.filter_by(plaque=v['plaque']).first():
            veh = Vehicule(
                plaque=v['plaque'], modele=v['modele'], capacite=v['cap'],
                ligne_id=v['ligne'].id if v.get('ligne') else None,
                km_actuel=v['km'], km_maintenance=v['km_m'],
                exp_vt=date.fromisoformat(v['vt']),
                exp_assurance=date.fromisoformat(v['ass']),
                statut=v.get('st','operationnel'),
            )
            db.session.add(veh)
    db.session.commit()
    print("✓ Véhicules démo créés")

    print("\n╔══════════════════════════════════════╗")
    print("║  Base de données initialisée !       ║")
    print("╠══════════════════════════════════════╣")
    print("║  admin        Admin@VIQ2026          ║")
    print("║  dg.01        DG@2026                ║")
    print("║  chef.01      Chef1@2026             ║")
    print("║  sup.01       Sup1@2026              ║")
    print("║  audit.01     Audit1@2026            ║")
    print("╚══════════════════════════════════════╝")
