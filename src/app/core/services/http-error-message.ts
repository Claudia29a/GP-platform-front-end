import { HttpErrorResponse } from '@angular/common/http';

/** Turns an HTTP error into a message that can be shown to the user. */
export function httpErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Something went wrong. Please try again.';
  }
  switch (error.status) {
    case 0:
      return 'The server cannot be reached. Please check that the back-end is running.';
    case 400:
      return 'The description is missing or too long.';
    case 404:
      return 'This question could not be found.';
    default:
      return `Something went wrong on the server (error ${error.status}). Please try again.`;
  }
}
