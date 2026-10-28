export const environment = {
  // During development requests to /api are forwarded to the back-end by proxy.conf.json.
  apiUrl: '/api',
  // Sign-up and sign-in with email and password (Account Service, ADR-010); forwarded the same way.
  accountApiUrl: '/api/account',
  // Public identifier of the CareBridge app at Google (not a secret).
  googleClientId: '393612150902-7hrg287o9jutuqhohfm0mlnpicruur60.apps.googleusercontent.com',
};
