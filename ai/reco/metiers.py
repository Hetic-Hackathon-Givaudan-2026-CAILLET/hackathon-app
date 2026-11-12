"""Étape C bis — Comprendre une demande incomplète grâce au métier de la boutique.

Le LLM traduit bien des mots d'ambiance (« frais », « boisé »…) mais invente des
scores quand la boutique ne donne que son métier (« je suis coiffeur, je veux un
parfum »). Ce module repère le métier et lui associe un profil type sur les 5 axes.

Origine des profils (colonne « source ») :
    « train »   moyenne des cas du jeu d'ENTRAÎNEMENT de ce métier (data/eval/cas_boutiques.csv,
                ids indiqués) : le jeu de test n'est jamais utilisé ;
    « expert »  valeur fixée à la main, faute de cas d'entraînement pour ce métier.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from .extraction import FORT, LEGER, LEXIQUE, _sans_accents


@dataclass(frozen=True)
class Metier:
    nom: str
    mots: tuple[str, ...]  # racines, sans accents ; testées en début de mot
    profil: tuple[int, int, int, int, int]  # chaleur, fraicheur, floral, boise, intensite
    source: str


# Ordre important : le premier métier trouvé l'emporte (« bar à vins » avant « bar »).
METIERS: list[Metier] = [
    Metier("salon de coiffure", ("coiffeu", "coiffure", "capillaire", "salon de coiff"), (2, 8, 5, 1, 4), "train 13, 39"),
    Metier("barbier", ("barbier", "barber"), (6, 1, 0, 9, 8), "train 5"),
    Metier("boulangerie-pâtisserie", ("boulang", "patisser", "salon de the", "viennoiser"), (9, 0, 2, 2, 6), "train 1, 2"),
    Metier("crêperie", ("creperie", "crepe", "gaufre"), (9, 1, 1, 1, 6), "expert"),
    Metier("glacier", ("glacier", "glace"), (3, 8, 2, 0, 4), "expert"),
    Metier("spa / institut de beauté", ("spa ", "spas", "institut", "esthetique", "estheticienne", "onglerie"), (1, 9, 3, 1, 2), "train 4"),
    Metier("cabinet de massage", ("massage", "masseu"), (3, 5, 5, 2, 2), "expert"),
    Metier("studio de yoga", ("yoga", "meditation", "pilates"), (2, 6, 4, 4, 3), "train 20"),
    Metier("fleuriste", ("fleuriste",), (2, 6, 9, 1, 4), "expert"),
    Metier("salle de sport", ("salle de sport", "fitness", "gym", "musculation", "crossfit"), (1, 9, 2, 2, 7), "train 10"),
    Metier("boutique de vélos", ("velo ", "velos", "cycle"), (2, 7, 1, 7, 5), "train 26"),
    Metier("magasin de surf", ("surf", "plage", "nautique"), (1, 9, 1, 2, 4), "train 23"),
    Metier("librairie", ("librair", "livre", "bouquin"), (7, 1, 1, 7, 4), "train 24"),
    Metier("bar à vins / cave", ("bar a vin", "cave", "caviste", "vin ", "vins", "rhum", "cigare", "whisky"), (8, 2, 3, 4, 6), "train 15, 32"),
    Metier("bar à cocktails", ("cocktail",), (4, 5, 4, 0, 6), "train 9"),
    Metier("bar à jus", ("bar a jus", "jus ", "smoothie"), (3, 8, 2, 0, 5), "expert"),
    Metier("café", ("cafe", "coffee", "torrefact"), (7, 1, 1, 5, 5), "expert"),
    Metier("boutique de thés", ("boutique de the", "maison de the", "the ", "thes "), (5, 5, 3, 3, 4), "expert"),
    Metier("épicerie fine", ("epicerie", "traiteur"), (2, 7, 4, 3, 5), "train 8"),
    Metier("fromagerie", ("fromag",), (1, 8, 3, 3, 4), "train 28"),
    Metier("boutique bio", ("bio", "vrac", "produits naturels"), (1, 7, 3, 3, 3), "train 16"),
    Metier("cosmétiques naturels", ("cosmetique", "savonner", "savon"), (2, 6, 7, 1, 4), "train 31"),
    Metier("parfumerie", ("parfumerie",), (5, 2, 7, 6, 7), "expert"),
    Metier("bijouterie", ("bijou", "joaill", "horlog"), (5, 2, 8, 3, 5), "expert"),
    Metier("lingerie", ("lingerie",), (5, 2, 8, 2, 5), "expert"),
    Metier("hôtel", ("hotel", "hall", "reception", "chambre d'hote"), (4, 4, 7, 3, 4), "expert"),
    Metier("pharmacie", ("pharmac", "parapharm"), (2, 8, 3, 1, 2), "expert"),
    Metier("cabinet médical / dentiste", ("dentist", "cabinet medical", "medecin", "kine", "clinique"), (1, 9, 2, 1, 3), "train 36"),
    Metier("agence / bureau", ("agence", "immobili", "bureau", "banque", "assurance", "cabinet"), (2, 7, 3, 3, 2), "train 33"),
    Metier("laverie / pressing", ("laverie", "pressing", "blanchisserie"), (2, 8, 5, 1, 3), "expert"),
    Metier("déco / maison", ("deco ", "decoration", "linge de maison", "scandinave"), (2, 7, 5, 2, 3), "train 40"),
    Metier("meubles", ("meuble", "ebenist", "menuis"), (5, 1, 1, 10, 6), "train 30"),
    Metier("bougies", ("bougie",), (8, 1, 2, 4, 5), "expert"),
    Metier("chaussures / maroquinerie", ("chaussure", "maroquin", "cordonn", "sellerie"), (7, 1, 0, 9, 7), "train 37"),
    Metier("mode masculine", ("homme", "masculin"), (6, 1, 1, 9, 6), "expert"),
    Metier("bonbons / jouets", ("bonbon", "confiser", "jouet", "enfant", "chocolaterie"), (7, 4, 3, 0, 6), "train 14, 35"),
    Metier("mode ado", ("ado ", "ados", "adolescent", "streetwear", "sneaker"), (4, 6, 4, 0, 7), "train 29"),
    Metier("concept store", ("concept",), (4, 5, 4, 4, 5), "expert"),
    Metier("boutique de vêtements", ("vetement", "pret-a-porter", "pret a porter", "boutique de mode", "mode ", "friperie"), (4, 5, 5, 3, 5), "expert"),
]

# Ni métier ni ambiance : un profil doux et équilibré, pour proposer quand même un choix
PROFIL_PAR_DEFAUT = (4, 5, 5, 2, 4)


def _cherche(t: str, mot: str) -> re.Match | None:
    # Début de mot obligatoire ; fin de mot aussi pour les mots très courts (« mer » ≠ « merci »)
    fin = r"(?![a-z])" if len(mot) <= 3 else ""
    return re.search(r"(?<![a-z])" + re.escape(mot) + fin, t)


def detecter_metier(texte: str) -> tuple[Metier | None, str]:
    """Métier repéré et texte privé des mots du métier (pour ne pas les compter comme ambiance)."""
    t = _sans_accents(texte) + " "
    for metier in METIERS:
        for mot in metier.mots:
            if m := _cherche(t, mot):
                debut = re.search(r"[a-z]*$", t[: m.start()]).start()
                fin = m.end() + re.match(r"[a-z]*", t[m.end():]).end()
                return metier, t[:debut] + " " + t[fin:]
    return None, t


# Mots d'ambiance absents du lexique des mots-clés (qui reste la référence de l'évaluation) :
# ils servent seulement à savoir si la demande décrit une ambiance.
AMBIANCE_EN_PLUS = ["fruit", "mangue", "peche", "fraise", "framboise", "cerise", "pomme", "poire", "ananas",
                    "exotique", "tropical", "festi", "musc", "elegan", "chic", "luxe", "raffine", "sensuel",
                    "romantique", "naturel", "cotonn", "savon", "calme", "serein", "dynamique", "gai",
                    "petillant", "joyeu", "lavande", "sauge", "the vert", "cafe", "noisette", "amande"]


def mots_ambiance(texte_sans_metier: str) -> list[str]:
    """Mots d'ambiance ou d'intensité présents dans la demande (hors mots du métier)."""
    mots = [m for liste in LEXIQUE.values() for m in liste] + FORT + LEGER + AMBIANCE_EN_PLUS
    return sorted({m for m in mots if _cherche(texte_sans_metier, m)})


QUESTION_AMBIANCE = ("Quelle ambiance souhaitez-vous : plutôt fraîche, chaleureuse, florale ou boisée ? "
                     "Et l'odeur doit-elle être discrète ou bien présente ?")
QUESTION_COMPLETE = ("Quel est votre type de boutique (coiffeur, boulangerie, librairie…) "
                     "et quelle ambiance souhaitez-vous : fraîche, chaleureuse, florale ou boisée ?")


def analyser(texte: str, variante: str = "few_shot") -> dict:
    """Lit une demande, même incomplète, et renvoie toujours 5 scores exploitables.

    - des mots d'ambiance       -> le LLM lit la demande (secours : mots-clés)
    - seulement un métier       -> profil type du métier (le LLM inventerait les scores)
    - ni métier ni ambiance     -> profil par défaut, et demande_complete = False
    `question_relance` propose une question à poser à la boutique pour affiner.
    """
    from .config import AXES
    from .extraction import extraire

    metier, reste = detecter_metier(texte)
    ambiance = mots_ambiance(reste)
    if ambiance:
        scores, methode = extraire(texte, variante)
        question = None
    elif metier:
        scores, methode = dict(zip(AXES, metier.profil)), "profil-metier"
        question = QUESTION_AMBIANCE
    else:
        scores, methode = dict(zip(AXES, PROFIL_PAR_DEFAUT)), "profil-par-defaut"
        question = QUESTION_COMPLETE
    return {
        "scores": scores,
        "methode": methode,
        "metier": metier.nom if metier else None,
        "mots_ambiance": ambiance,
        "demande_complete": bool(metier or ambiance),
        "question_relance": question,
    }
