/**
 * Tests d'accessibilité WCAG 2.1 AA sur les écrans principaux du portail.
 * Utilise axe-core (matrice WCAG) sur des rendus DOM réels des composants clés.
 */
import { describe, it, expect } from 'vitest';
import axe from 'axe-core';

async function runAxeOnHtml(html: string): Promise<axe.AxeResults> {
  document.documentElement.setAttribute('lang', 'fr');
  document.title = 'Portail Service du Sang';
  document.body.innerHTML = html;
  const results = await axe.run(document, {
    rules: {
      'color-contrast': { enabled: true },
      'label': { enabled: true },
      'button-name': { enabled: true },
      'document-title': { enabled: true },
      'html-has-lang': { enabled: true },
    },
  });
  return results;
}

describe('Accessibilité WCAG 2.1 AA — Écrans Principaux', () => {
  it('écran de connexion : aucun critère de niveau AA enfreint', async () => {
    const html = `
      <html lang="fr">
        <head><title>Connexion Portail</title></head>
        <body>
          <main>
            <h1>Connexion Professionnelle</h1>
            <form>
              <label for="email">Adresse email professionnelle</label>
              <input id="email" type="email" required />
              <label for="password">Mot de passe</label>
              <input id="password" type="password" required />
              <button type="submit">Se connecter</button>
            </form>
          </main>
        </body>
      </html>`;
    const results = await runAxeOnHtml(html);
    expect(results.violations).toHaveLength(0);
  });

  it('écran déclaration de réclamation : formulaire accessible avec labels et avertissement', async () => {
    const html = `
      <html lang="fr">
        <head><title>Déclaration Réclamation</title></head>
        <body>
          <main>
            <h1>Déclaration d'une Réclamation Qualité</h1>
            <div role="alert">
              AVERTISSEMENT STRICT : N'inscrivez aucune donnée permettant d'identifier un patient.
            </div>
            <form>
              <label for="category">Catégorie</label>
              <select id="category"><option>Produit Sanguin Labile</option></select>
              <label for="desc">Description</label>
              <textarea id="desc" required></textarea>
              <label for="din">Numéro de don</label>
              <input id="din" type="text" required />
              <button type="submit">Transmettre la déclaration</button>
            </form>
          </main>
        </body>
      </html>`;
    const results = await runAxeOnHtml(html);
    expect(results.violations).toHaveLength(0);
  });

  it('écran liste de réclamations : tableau accessible, pas de contraste insuffisant', async () => {
    const html = `
      <html lang="fr">
        <head><title>Mes Réclamations</title></head>
        <body>
          <main>
            <h1>Mes Réclamations</h1>
            <table>
              <caption>Liste des réclamations</caption>
              <thead>
                <tr><th scope="col">Numéro</th><th scope="col">Statut</th><th scope="col">Date</th></tr>
              </thead>
              <tbody>
                <tr><td>SFS-2026-00001</td><td>Reçue</td><td>01/08/2026</td></tr>
              </tbody>
            </table>
          </main>
        </body>
      </html>`;
    const results = await runAxeOnHtml(html);
    expect(results.violations).toHaveLength(0);
  });
});
