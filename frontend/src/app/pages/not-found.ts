import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  template: `<section class="card empty-state">
    <p class="eyebrow">Erreur 404</p>
    <h1>Cette page est introuvable.</h1>
    <p>Le lien est peut-être incorrect ou la page a été déplacée.</p>
    <a class="button" routerLink="/">Retour à l’accueil</a>
  </section>`,
})
export class NotFound {}
