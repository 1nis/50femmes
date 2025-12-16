# 50 Femmes Connues 👩‍🔬🎨✊

**50 Femmes Connues** est un jeu web interactif de culture générale. L'objectif est de citer 50 femmes célèbres le plus rapidement possible. Le jeu utilise les APIs de Wikipédia et Wikidata en temps réel pour valider les réponses, vérifier le genre et récupérer les occupations des personnalités proposées.

## 🌟 Fonctionnalités

  * **Validation en temps réel** : Utilisation de l'API Wikipédia pour trouver la personnalité correspondante à la saisie.
  * **Vérification stricte et intelligente** :
      * **Orthographe** : Comparaison précise (Distance de Levenshtein) pour tolérer les petites erreurs de frappe tout en exigeant une réponse correcte.
      * **Genre** : Vérification automatique via Wikidata (Propriété P21) pour s'assurer que la personnalité est bien une femme (ou femme trans).
      * **Doublons** : Détection automatique pour empêcher de valider deux fois la même personne.
  * **Catégorisation dynamique** : Récupération automatique du métier ou domaine d'activité (Science, Politique, Arts, Activisme, etc.) via Wikidata (Propriété P106).
  * **Interface immersive** :
      * Mode sombre (Dark mode) avec accents dorés.
      * Animations CSS fluides.
      * Indicateur de progression circulaire.
      * Chronomètre intégré qui se lance à la première tentative.

## 🛠️ Stack Technique

  * **Frontend** : JavaScript (Vanilla ES6+), HTML5, CSS3.
  * **Build Tool** : [Vite](https://vitejs.dev/).
  * **Containerisation** : Docker, Docker Compose.
  * **Serveur de Production** : Nginx (Alpine Linux).

## 🚀 Installation et Démarrage

### Prérequis

  * [Node.js](https://nodejs.org/) (v18+)
  * [Docker](https://www.docker.com/) & Docker Compose (optionnel)

### 1\. Développement Local

Pour lancer le projet sur votre machine sans Docker :

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

L'application sera accessible sur `http://localhost:5173` (port par défaut de Vite).

### 2\. Déploiement avec Docker

Le projet inclut une configuration Docker prête à l'emploi (multi-stage build : Node.js pour la compilation, Nginx pour servir les fichiers statiques).

```bash
# Construire et lancer les conteneurs en tâche de fond
docker-compose up -d --build
```

L'application sera accessible sur `http://localhost:8095` (configuré dans `docker-compose.yml`).

> **Note Cloudflare :** Le fichier `docker-compose.yml` inclut un service `cloudflared` pour exposer l'application via un tunnel. Si vous n'utilisez pas Cloudflare Tunnel, vous pouvez commenter ce service ou fournir votre token dans la variable d'environnement `TUNNEL_TOKEN`.

## 📂 Structure du Projet

```plaintext
.
├── public/              # Fichiers statiques (favicon, etc.)
├── src/
│   ├── main.js          # Logique principale (Appels API, Gestion du jeu, DOM)
│   ├── style.css        # Styles globaux (CSS variables, Animations, Responsive)
│   ├── data.js          # Données de repli (fallback)
│   └── counter.js       # Composant utilitaire
├── index.html           # Point d'entrée HTML
├── Dockerfile           # Configuration de l'image Docker de production
├── docker-compose.yml   # Orchestration des services (App + Cloudflared)
├── package.json         # Dépendances (Vite) et scripts NPM
└── vite.config.js       # Configuration Vite (implicite)
```

## 🧠 Fonctionnement de la Logique (API)

Le fichier `src/main.js` gère la logique de validation suivante :

1.  **Recherche** : Interrogation de l'API Wikipédia (FR) pour trouver la page la plus pertinente correspondant à la saisie utilisateur.
2.  **Matching** : Analyse du titre retourné vs la saisie utilisateur (tolérance stricte mot par mot).
3.  **Wikidata** : Récupération de l'identifiant Wikidata associé à la page Wikipédia trouvée.
4.  **Vérification Sexe/Genre** : Requête Wikidata sur la propriété **P21** pour valider le genre (Féminin/Femme trans).
5.  **Enrichissement** : Requête Wikidata sur la propriété **P106** (Occupation) pour afficher la catégorie (ex: "Actrice", "Physicienne").

## 🎨 Personnalisation

Le design repose sur des variables CSS définies dans `src/style.css`, facilitant la personnalisation des couleurs :

```css
:root {
  --primary-bg: #1a0b2e;      /* Fond principal violet foncé */
  --accent-color: #ffd700;    /* Accents dorés */
  --text-primary: #ffffff;
  --font-heading: 'Playfair Display', serif;
  --font-body: 'Outfit', sans-serif;
}
```

## 📄 Licence

Ce projet est destiné à des fins éducatives et de divertissement.
