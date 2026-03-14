MOCK_EMAILS = {
    "school": [
        {
            "from": "prof.martinez@sorbonne.fr",
            "subject": "Rendu TP Deep Learning",
            "body": "Le rendu du TP sur les transformers est pour mercredi 18 mars 23h59. Format notebook + rapport PDF. Pas d'extension possible.",
            "date": "2026-03-12",
            "days_since_reply": 0,
        },
        {
            "from": "admin-master@sorbonne.fr",
            "subject": "Soutenance memoire - date fixee",
            "body": "Votre soutenance est fixee au 15 avril. Merci de confirmer votre sujet avant le 25 mars.",
            "date": "2026-03-13",
            "days_since_reply": 1,
        },
    ],
    "company": [
        {
            "from": "sophie.renard@bnpparibas.com",
            "subject": "Re: Dashboard analytics - feedback",
            "body": "Le product owner attend les corrections sur le dashboard avant lundi matin. Les KPIs ne remontent pas correctement en prod. C'est bloquant pour la review sprint.",
            "date": "2026-03-08",
            "days_since_reply": 6,
        },
        {
            "from": "tech-lead@bnpparibas.com",
            "subject": "Daily standup notes",
            "body": "Action item pour toi : fixer le bug sur le filtre date du dashboard. Sprint review mardi.",
            "date": "2026-03-13",
            "days_since_reply": 1,
        },
    ],
    "startup": [
        {
            "from": "yassine@noctaai.com",
            "subject": "Re: Landing page v2",
            "body": "La landing est live mais le taux de conversion est a 0.8%. On doit refaire le hero. Tu peux t'en occuper ce weekend ?",
            "date": "2026-03-11",
            "days_since_reply": 3,
        },
        {
            "from": "newsletter@techcrunch.com",
            "subject": "Y Combinator ouvre les candidatures W26",
            "body": "YC Winter 2026 applications are now open. Deadline: April 10. Focus on AI-native startups.",
            "date": "2026-03-14",
            "days_since_reply": None,
        },
    ],
}

MOCK_EVENTS = {
    "school": [
        {"title": "TP Deep Learning - rendu", "time": "2026-03-18T23:59", "prep_block": False},
        {"title": "Cours NLP avance", "time": "2026-03-15T09:00", "prep_block": True},
    ],
    "company": [
        {"title": "Sprint Review", "time": "2026-03-17T10:00", "prep_block": False},
        {"title": "Daily Standup", "time": "2026-03-14T09:30", "prep_block": True},
    ],
    "startup": [],
}

MOCK_SEARCH = {
    "school": "Sorbonne Universite - les inscriptions au Master IA 2026 battent des records, +40% de candidatures.",
    "company": "BNP Paribas lance un nouveau programme d'acceleration data & IA pour ses alternants.",
    "startup": "Y Combinator ouvre les candidatures Winter 2026. Deadline 10 avril. Focus AI-native startups.",
}
