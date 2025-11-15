/**
 * Settings dashboard connecting AuthContext to the /settings backend routes.
 * Handles CRUD for trusted contacts so the panic workflow knows which numbers
 * to pass along to Twilio.
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import {
  getTrustedContacts,
  createTrustedContact,
  deleteTrustedContact,
  updateUserProfile,
} from "../services/api";

// Import logo for header - will be undefined if file doesn't exist
let headerLogo;
try {
  headerLogo = new URL("../assets/images/logo.png", import.meta.url).href;
} catch {
  headerLogo = null;
}

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
      <div className="settings-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {headerLogo && (
            <img 
              src={headerLogo} 
              alt="SafeRoute NYC" 
              className="header-logo"
            />
          )}
          <h1>Settings</h1>
        </div>
        <Link to="/" className="back-button">
          ← Back to Map
        </Link>
      </div>
      
      {error && <div className="error-banner">{error}</div>}

      <div className="settings-card">
        <h2>User Profile</h2>
        <form onSubmit={handleUpdateProfile} className="settings-form">
          <div className="form-group">
            <label htmlFor="default-phone">Default Phone Number</label>
            <input
              id="default-phone"
              type="tel"
              value={defaultPhone}
              onChange={(e) => setDefaultPhone(e.target.value)}
              placeholder="+15555555555"
            />
          </div>
          <div className="info-text">
            <span className="info-label">Last panic alert:</span>
            <span>{lastAlertAt ? new Date(lastAlertAt).toLocaleString() : "No alerts yet"}</span>
          </div>
          <button type="submit" disabled={isUpdatingProfile} className="primary-button">
            {isUpdatingProfile ? "Updating..." : "Update Profile"}
          </button>
        </form>
      </div>

      <div className="settings-card">
        <h2>Trusted Contacts</h2>
        
        {isLoading ? (
          <p className="loading-text">Loading contacts...</p>
        ) : (
          <>
            {contacts.length === 0 ? (
              <p className="empty-state">No contacts yet. Add one below.</p>
            ) : (
              <ul className="contact-list">
                {contacts.map((contact) => (
                  <li key={contact.id} className="contact-item">
                    <div className="contact-info">
                      <span className="contact-name">{contact.name}</span>
                      <span className="contact-phone">{contact.phone_number}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      className="delete-button"
                      type="button"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="divider"></div>
            
            <form onSubmit={handleAddContact} className="settings-form">
              <h3 className="form-section-title">Add New Contact</h3>
              <div className="form-group">
                <label htmlFor="contact-name">Name (optional)</label>
                <input
                  id="contact-name"
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Trusted Contact"
                />
              </div>
              <div className="form-group">
                <label htmlFor="contact-phone">Phone Number <span className="required">*</span></label>
                <input
                  id="contact-phone"
                  type="tel"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="+15555555555"
                  required
                />
              </div>
              <button type="submit" disabled={isAdding} className="primary-button">
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
