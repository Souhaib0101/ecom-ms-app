import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Vue d’ensemble · Ecom',
    loadComponent: () => import('./pages/overview/overview').then((page) => page.Overview),
  },
  {
    path: '**',
    title: 'Page introuvable · Ecom',
    loadComponent: () => import('./pages/not-found').then((page) => page.NotFound),
  },
];
