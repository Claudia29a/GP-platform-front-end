import { HttpErrorResponse } from '@angular/common/http';

import { httpErrorMessage } from './http-error-message';

describe('httpErrorMessage', () => {
  const forStatus = (status: number) => httpErrorMessage(new HttpErrorResponse({ status }));

  it('explains each status the back-end uses in plain words', () => {
    expect(forStatus(0)).toContain('cannot be reached');
    expect(forStatus(400)).toContain('Some answers are missing or not valid');
    expect(forStatus(401)).toContain('Your session has ended');
    expect(forStatus(403)).toContain('does not have access');
    expect(forStatus(404)).toContain('could not be found');
  });

  it('mentions the status for other server errors', () => {
    expect(forStatus(503)).toContain('error 503');
  });

  it('has a general message for errors that are not HTTP errors', () => {
    expect(httpErrorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });
});
