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
    path: 'factures',
    title: 'Factures · Ecom',
    loadComponent: () => import('./pages/bills/bills').then((page) => page.Bills),
  },
  {
    path: 'factures/nouvelle',
    title: 'Nouvelle facture · Ecom',
    loadComponent: () => import('./pages/bills/bill-create').then((page) => page.BillCreate),
  },
  {
    path: 'factures/:id',
    title: 'Détail de la facture · Ecom',
    loadComponent: () => import('./pages/bills/bill-details').then((page) => page.BillDetails),
  },
  {
    path: '**',
    title: 'Page introuvable · Ecom',
    loadComponent: () => import('./pages/not-found').then((page) => page.NotFound),
  },
];
