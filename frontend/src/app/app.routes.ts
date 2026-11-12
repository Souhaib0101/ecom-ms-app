import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Vue d’ensemble · Ecom',
    loadComponent: () => import('./pages/overview/overview').then((page) => page.Overview),
  },
  {
    path: 'clients',
    title: 'Clients · Ecom',
    loadComponent: () => import('./pages/customers/customers').then((page) => page.Customers),
  },
  {
    path: 'produits',
    title: 'Produits · Ecom',
    loadComponent: () => import('./pages/products/products').then((page) => page.Products),
  },
  {
    path: '**',
    title: 'Page introuvable · Ecom',
    loadComponent: () => import('./pages/not-found').then((page) => page.NotFound),
  },
];
