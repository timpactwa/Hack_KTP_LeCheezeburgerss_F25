import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import {
  getTrustedContacts,
  createTrustedContact,
  deleteTrustedContact,
  updateUserProfile,
} from "../services/api";

function SettingsPage() {
  const { user, updateUser, lastAlertAt } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form states
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [defaultPhone, setDefaultPhone] = useState(user?.default_phone || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Load contacts on mount
  useEffect(() => {
    if (user) {
      loadContacts();
    }
  }, [user]);

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getTrustedContacts();
      setContacts(data.contacts || []);
    } catch (err) {
      console.error("Failed to load contacts:", err);
      setError("Failed to load contacts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContactPhone.trim()) {
      setError("Phone number is required");
      return;
    }

    try {
      setIsAdding(true);
      setError(null);
      const contact = await createTrustedContact({
        name: newContactName.trim() || "Trusted Contact",
        phone_number: newContactPhone.trim(),
      });
      
      setContacts([...contacts, contact]);
      setNewContactName("");
      setNewContactPhone("");
      
      // Update user in context (keep phone numbers for backward compatibility)
      const currentPhones = Array.isArray(user.trusted_contacts) 
        ? user.trusted_contacts.map(c => typeof c === 'string' ? c : c.phone_number || c)
        : [];
      updateUser({
        ...user,
        trusted_contacts: [...currentPhones, contact.phone_number],
      });
    } catch (err) {
      console.error("Failed to add contact:", err);
      setError(err.response?.data?.error || "Failed to add contact");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!confirm("Are you sure you want to delete this contact?")) {
      return;
    }

    try {
      setError(null);
      await deleteTrustedContact(contactId);
      setContacts(contacts.filter((c) => c.id !== contactId));
      
      // Update user in context
      const updatedContacts = contacts
        .filter((c) => c.id !== contactId)
        .map((c) => c.phone_number);
      updateUser({
        ...user,
        trusted_contacts: updatedContacts,
      });
    } catch (err) {
      console.error("Failed to delete contact:", err);
      setError(err.response?.data?.error || "Failed to delete contact");
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setIsUpdatingProfile(true);
      setError(null);
      const updatedUser = await updateUserProfile({
        default_phone: defaultPhone.trim() || null,
      });
      
      // Update user in context
      updateUser(updatedUser);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setError(err.response?.data?.error || "Failed to update profile");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  if (!user) {
    return (
      <div className="settings-shell">
        <h1>Settings</h1>
        <p>Sign in to manage settings.</p>
      </div>
    );
  }

  return (
    <div className="settings-shell">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>Settings</h1>
        <Link
          to="/"
          style={{
            padding: "0.5rem 1rem",
            background: "rgba(148, 163, 184, 0.2)",
            color: "#f8fafc",
            textDecoration: "none",
            borderRadius: "0.5rem",
            fontSize: "0.9rem",
            border: "1px solid rgba(148, 163, 184, 0.3)",
          }}
        >
          ← Back to Map
        </Link>
      </div>
      
      {error && <div className="error-text">{error}</div>}

      <div className="settings-card">
        <h2>User Profile</h2>
        <form onSubmit={handleUpdateProfile}>
          <label>
            Default Phone Number
            <input
              type="tel"
              value={defaultPhone}
              onChange={(e) => setDefaultPhone(e.target.value)}
              placeholder="+15555555555"
            />
          </label>
          <p className="muted-text">
            Last panic alert: {lastAlertAt ? new Date(lastAlertAt).toLocaleString() : "No alerts yet"}
          </p>
          <button type="submit" disabled={isUpdatingProfile}>
            {isUpdatingProfile ? "Updating..." : "Update Profile"}
          </button>
        </form>
      </div>

        <div className="settings-card">
          <h2>Trusted Contacts</h2>
        
        {isLoading ? (
          <p>Loading contacts...</p>
        ) : (
          <>
            {contacts.length === 0 ? (
              <p>No contacts yet. Add one below.</p>
            ) : (
              <ul>
                {contacts.map((contact) => (
                  <li key={contact.id}>
                    <strong>{contact.name}</strong>: {contact.phone_number}
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      className="delete-btn"
                      style={{ marginLeft: "10px", padding: "4px 8px" }}
                    >
                      Delete
                    </button>
                  </li>
                ))}
          </ul>
            )}

            <form onSubmit={handleAddContact} style={{ marginTop: "20px" }}>
              <h3>Add New Contact</h3>
              <label>
                Name (optional)
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Trusted Contact"
                />
              </label>
              <label>
                Phone Number *
                <input
                  type="tel"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="+15555555555"
                  required
                />
              </label>
              <button type="submit" disabled={isAdding}>
                {isAdding ? "Adding..." : "Add Contact"}
              </button>
            </form>
          </>
        )}
        </div>
    </div>
  );
}

export default SettingsPage;
