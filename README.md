# ÉCLAT – Studio IA (vidéo, image, voix)

Dossier prêt pour GitHub + Vercel. Frontend: `index.html`. Backend: dossier `api/`.

## Ce que le site fait
Vidéo (texte→vidéo), Animer une photo, Image (avec image de référence), Image parlante, Motion Control,
Full HD (upscale), Voix IA, Sans fond. 2 essais gratuits par jour, puis crédits. Connexion Google / Apple / Microsoft / e-mail.
Reels = flux de vidéos. Claudia = assistante prompts (marche dans Claude seulement).

## Étapes (dans l'ordre)
1. **GitHub**: crée un repo, envoie TOUT le contenu de ce dossier (garde la structure: api/, clips/).
2. **Supabase** (supabase.com, gratuit): New project.
   - SQL Editor: colle `schema.sql` et clique Run.
   - Authentication > Providers: active Google, Apple, Azure (Microsoft) et Email. Pour chaque fournisseur, crée les clés chez Google/Apple/Microsoft et mets l'URL de callback que Supabase affiche.
   - Authentication > URL Configuration: mets l'URL de ton site Vercel.
   - Project Settings > API: copie `Project URL` et la clé `anon` dans `config.js`. Copie la clé `service_role` pour l'étape 4.
3. **fal.ai** (fal.ai): crée une clé API. Dans Models, choisis un modèle pour chaque outil (voir `.env.example`) et copie son ID.
   ⚠️ Chaque modèle a ses propres champs. Ouvre la page API du modèle et ajuste `buildInput` dans `api/generate.js` si besoin. Ce code n'a pas été testé avec un modèle réel.
4. **Vercel**: Add New > Project > ton repo > avant Deploy, ajoute les variables de `.env.example`.
5. **Stripe** (paiements): crée une clé secrète. Dans Developers > Webhooks, ajoute `https://TON-SITE/api/webhook` (événement `checkout.session.completed`) et copie le secret `whsec_...` dans `STRIPE_WEBHOOK_SECRET`. (MonCash n'est pas inclus.)
6. Redéploie. Teste: connexion, 1 essai gratuit, achat avec une carte de test Stripe.

## À savoir
- Sans `config.js` rempli, le site tourne en **mode démo** (aucune création réelle).
- Les crédits et essais sont comptés **côté serveur** (impossible à tricher depuis le navigateur). Si une création échoue, l'essai ou les crédits sont remboursés.
- Les coûts réels viennent de fal.ai: calcule tes prix avec leurs tarifs avant de vendre des crédits.
- Mets une page Conditions + Confidentialité. Interdis les vidéos avec le visage d'une vraie personne sans son accord et le contenu sexuel.
- Les vidéos des Reels de départ (`clips/`) sont des exemples. Les vidéos publiées par les utilisateurs sont stockées seulement sur leur appareil pour l'instant.
- Les résultats fal.ai sont des liens temporaires: pour les garder, copie-les dans Supabase Storage (à ajouter).
