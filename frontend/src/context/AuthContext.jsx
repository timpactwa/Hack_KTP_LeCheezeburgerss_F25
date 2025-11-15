// Context provider that will cache JWTs + user metadata fetched from the Flask
// auth endpoints. Components like LoginPage, RouteForm, PanicButton, and
// SettingsPage will consume this context to gate access and inject auth headers.
