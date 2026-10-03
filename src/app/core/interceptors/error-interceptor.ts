import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { inject } from '@angular/core';

// Da impostare a true per le chiamate secondarie che gestiscono l'errore in autonomia (es. con un fallback)
export const SKIP_ERROR_REDIRECT = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const _router = inject(Router);

  if (req.context.get(SKIP_ERROR_REDIRECT)) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error) => {
      switch (error.status) {
        case 401:
        case 403:
          _router.navigate(['/error', error.status]);
          break;
        case 404:
          console.warn('Resource not found (404):', error.url);
          if (error.url?.includes('/resolve-path/')) {
            _router.navigate(['/error', 404]);
          }
          break;
        default:
          // 0 = rete assente o CORS
          if (error.status === 0 || error.status >= 500) {
            _router.navigate(['/error', 500]);
          }
      }
      return throwError(() => error);
    }),
  );
};
