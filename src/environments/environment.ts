/** Paths on the app's own address, so they stay the same in every environment. */
export const environment = {
  // During development requests to /api are forwarded to the back-end by proxy.conf.json.
  apiUrl: '/api',
  // Sign-up and sign-in with email and password (Account Service, ADR-010); forwarded the same way.
  accountApiUrl: '/api/account',
};
