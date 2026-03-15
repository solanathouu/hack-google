MOCK_EMAILS = {
    "school": [
        {
            "from": "prof.martinez@eugenia.school",
            "subject": "Rendu TP Deep Learning",
            "body": "Le rendu du TP sur les transformers est pour mercredi 18 mars 23h59. Format notebook + rapport PDF. Pas d'extension possible.",
            "date": "2026-03-12",
            "days_since_reply": 0,
        },
        {
            "from": "admin-master@eugenia.school",
            "subject": "Soutenance memoire - date fixee",
            "body": "Votre soutenance est fixee au 15 avril. Merci de confirmer votre sujet avant le 25 mars.",
            "date": "2026-03-13",
            "days_since_reply": 1,
        },
        {
            "from": "prof.dubois@eugenia.school",
            "subject": "Projet NLP - constitution des groupes",
            "body": "Les groupes pour le projet NLP doivent etre constitues avant vendredi. 3 personnes max. Envoyez-moi vos groupes par mail.",
            "date": "2026-03-14",
            "days_since_reply": 0,
        },
        {
            "from": "bde-ia@eugenia.school",
            "subject": "Hackathon IA Eugenia - 22 mars",
            "body": "Le hackathon annuel du Master IA aura lieu le 22 mars. Inscriptions ouvertes, equipes de 4. Theme : IA generative appliquee a la sante.",
            "date": "2026-03-14",
            "days_since_reply": None,
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
        {
            "from": "rh@bnpparibas.com",
            "subject": "Convention alternance - signature requise",
            "body": "Merci de signer et retourner votre convention d'alternance avant le 20 mars. Document en piece jointe.",
            "date": "2026-03-12",
            "days_since_reply": 2,
        },
        {
            "from": "sophie.renard@bnpparibas.com",
            "subject": "Formation Power BI - jeudi 14h",
            "body": "N'oublie pas la formation Power BI jeudi a 14h en salle 3B. C'est obligatoire pour tous les alternants data.",
            "date": "2026-03-13",
            "days_since_reply": 0,
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
        {
            "from": "investisseur@station-f.co",
            "subject": "Suite a notre echange - NoctaAI",
            "body": "Merci pour le pitch de mardi. On aimerait voir une demo live de votre produit. Dispo semaine prochaine ?",
            "date": "2026-03-13",
            "days_since_reply": 1,
        },
        {
            "from": "yassine@noctaai.com",
            "subject": "Roadmap produit Q2",
            "body": "J'ai mis a jour la roadmap sur Notion. On doit prioriser : auth Google, integration Slack, et le mode offline. On en parle dimanche ?",
            "date": "2026-03-14",
            "days_since_reply": 0,
        },
    ],
}

MOCK_EVENTS = {
    "school": [
        {"title": "TP Deep Learning - rendu", "time": "2026-03-18T23:59", "prep_block": False},
        {"title": "Cours NLP avance", "time": "2026-03-15T09:00", "prep_block": True},
        {"title": "TD Maths pour le ML", "time": "2026-03-14T14:00", "prep_block": False},
        {"title": "Reunion groupe projet NLP", "time": "2026-03-16T11:00", "prep_block": False},
        {"title": "Hackathon IA Eugenia", "time": "2026-03-22T09:00", "prep_block": False},
    ],
    "company": [
        {"title": "Sprint Review", "time": "2026-03-17T10:00", "prep_block": False},
        {"title": "Daily Standup", "time": "2026-03-14T09:30", "prep_block": True},
        {"title": "Formation Power BI", "time": "2026-03-14T14:00", "prep_block": False},
        {"title": "1:1 avec Sophie", "time": "2026-03-15T11:00", "prep_block": False},
        {"title": "Demo client interne", "time": "2026-03-19T15:00", "prep_block": False},
    ],
    "startup": [
        {"title": "Call investisseur Station F", "time": "2026-03-17T18:00", "prep_block": False},
        {"title": "Sync produit avec Yassine", "time": "2026-03-16T20:00", "prep_block": False},
        {"title": "Deadline YC W26", "time": "2026-04-10T23:59", "prep_block": False},
    ],
}

MOCK_SEARCH = {
    "school": "Eugenia Universite - les inscriptions au Master IA 2026 battent des records, +40% de candidatures.",
    "company": "BNP Paribas lance un nouveau programme d'acceleration data & IA pour ses alternants.",
    "startup": "Y Combinator ouvre les candidatures Winter 2026. Deadline 10 avril. Focus AI-native startups.",
}
