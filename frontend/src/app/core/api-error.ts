import { HttpErrorResponse } from '@angular/common/http';

export function apiError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Une erreur est survenue. Veuillez réessayer.';
  }
  if (error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504) {
    return 'Un service est indisponible. Vérifiez le démarrage du backend, puis réessayez.';
  }
  if (typeof error.error?.detail === 'string') return error.error.detail;
  if (error.status === 404) return 'Cette ressource n’existe plus. Actualisez la liste.';
  if (error.status === 409) return 'Cette opération est en conflit avec les données existantes.';
  if (error.status === 400 || error.status === 422)
    return 'Vérifiez les informations saisies et réessayez.';
  return 'L’opération n’a pas abouti. Veuillez réessayer.';
}
