def format_fcfa(valeur):
    """Formater un montant en FCFA lisible."""
    if valeur is None:
        return '—'
    if abs(valeur) >= 1_000_000:
        return f"{valeur/1_000_000:.1f}M"
    if abs(valeur) >= 1_000:
        return f"{valeur/1_000:.0f}k"
    return f"{int(valeur):,}".replace(',', ' ')

def format_pct(val, decimals=1):
    return f"{val:.{decimals}f}%"

def badge_class(valeur, seuil_ok, seuil_warn, inverse=False):
    """Renvoie la classe CSS du badge selon les seuils."""
    if inverse:
        if valeur <= seuil_ok:   return 'bok'
        if valeur <= seuil_warn: return 'bwn'
        return 'bal'
    else:
        if valeur >= seuil_ok:   return 'bok'
        if valeur >= seuil_warn: return 'bwn'
        return 'bal'
