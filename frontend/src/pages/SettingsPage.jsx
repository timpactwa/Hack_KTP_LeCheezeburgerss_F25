import { useAuth } from "../context/AuthContext";

function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="settings-shell">
      <h1>Settings</h1>
      {user ? (
        <div className="settings-card">
          <h2>Trusted Contacts</h2>
          <ul>
            {user.trusted_contacts?.map((contact) => (
              <li key={contact}>{contact}</li>
            )) || <li>No contacts yet</li>}
          </ul>
          <p>Editing contacts will be available once the database is live.</p>
        </div>
      ) : (
        <p>Sign in to manage settings.</p>
      )}
    </div>
  );
}

export default SettingsPage;
