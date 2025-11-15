import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../context/AuthContext";
import {
  fetchProfile,
  updateProfile,
  fetchTrustedContacts,
  createTrustedContact,
  updateTrustedContact,
  deleteTrustedContact,
} from "../services/api";
import Spinner from "../components/Spinner";

function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const initialContacts = useMemo(() => {
    if (!user?.trusted_contacts) return [];
    return user.trusted_contacts.map((phone, idx) => ({
      id: idx + 1,
      name: `Contact ${idx + 1}`,
      phone,
    }));
  }, [user]);

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
    enabled: Boolean(user),
  });

  const {
    data: contacts,
    isLoading: contactsLoading,
    error: contactsError,
  } = useQuery({
    queryKey: ["contacts"],
    queryFn: fetchTrustedContacts,
    enabled: Boolean(user),
    initialData: initialContacts,
  });

  const [profilePhone, setProfilePhone] = useState("");
  const [addForm, setAddForm] = useState({ name: "", phone: "" });
  const [formError, setFormError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ name: "", phone: "" });

  useEffect(() => {
    if (profile?.default_phone) {
      setProfilePhone(profile.default_phone);
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => queryClient.invalidateQueries(["profile"]),
    onError: () => setFormError("Could not update profile right now."),
  });

  const addContactMutation = useMutation({
    mutationFn: createTrustedContact,
    onSuccess: () => {
      queryClient.invalidateQueries(["contacts"]);
      setAddForm({ name: "", phone: "" });
      setFormError(null);
    },
    onError: () => setFormError("Unable to add contact."),
  });

  const editContactMutation = useMutation({
    mutationFn: ({ id, values }) => updateTrustedContact(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries(["contacts"]);
      setEditingId(null);
      setFormError(null);
    },
    onError: () => setFormError("Unable to update contact."),
  });

  const deleteContactMutation = useMutation({
    mutationFn: deleteTrustedContact,
    onSuccess: () => queryClient.invalidateQueries(["contacts"]),
    onError: () => setFormError("Unable to delete contact."),
  });

  const handleProfileSubmit = (event) => {
    event.preventDefault();
    if (!profilePhone.trim()) {
      setFormError("Phone number is required");
      return;
    }
    updateProfileMutation.mutate({ default_phone: profilePhone.trim() });
  };

  const handleAddContact = (event) => {
    event.preventDefault();
    if (!addForm.name.trim() || !addForm.phone.trim()) {
      setFormError("Name and phone are required");
      return;
    }
    setFormError(null);
    addContactMutation.mutate({ name: addForm.name.trim(), phone: addForm.phone.trim() });
  };

  const startEditing = (contact) => {
    setEditingId(contact.id);
    setEditValues({ name: contact.name, phone: contact.phone });
  };

  const confirmEdit = (event) => {
    event.preventDefault();
    if (!editValues.name.trim() || !editValues.phone.trim()) {
      setFormError("Name and phone are required");
      return;
    }
    editContactMutation.mutate({ id: editingId, values: editValues });
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
      <h1>Settings</h1>
      <div className="settings-card">
        <h2>Profile</h2>
        {profileLoading ? (
          <Spinner label="Loading profile" />
        ) : profileError ? (
          <p className="error-text">Unable to load profile.</p>
        ) : (
          <form onSubmit={handleProfileSubmit} className="settings-form">
            <label>
              Email
              <input value={profile?.email || user.email} disabled />
            </label>
            <label>
              Default panic phone
              <input
                type="tel"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
              />
            </label>
            <button type="submit" disabled={updateProfileMutation.isLoading}>
              {updateProfileMutation.isLoading ? "Saving…" : "Save profile"}
            </button>
          </form>
        )}
      </div>

      <div className="settings-card">
        <h2>Trusted contacts</h2>
        {contactsLoading ? (
          <Spinner label="Loading contacts" />
        ) : contactsError ? (
          <p className="error-text">Unable to load contacts.</p>
        ) : (
          <ul className="contact-list">
            {contacts?.length ? (
              contacts.map((contact) => (
                <li key={contact.id} className="contact-item">
                  {editingId === contact.id ? (
                    <form onSubmit={confirmEdit} className="contact-edit-form">
                      <input
                        value={editValues.name}
                        onChange={(e) => setEditValues((prev) => ({ ...prev, name: e.target.value }))}
                      />
                      <input
                        value={editValues.phone}
                        onChange={(e) => setEditValues((prev) => ({ ...prev, phone: e.target.value }))}
                      />
                      <button type="submit" disabled={editContactMutation.isLoading}>
                        {editContactMutation.isLoading ? "Saving…" : "Save"}
                      </button>
                      <button type="button" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <div>
                        <strong>{contact.name}</strong>
                        <p>{contact.phone}</p>
                      </div>
                      <div className="contact-actions">
                        <button type="button" onClick={() => startEditing(contact)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteContactMutation.mutate(contact.id)}
                          disabled={deleteContactMutation.isLoading}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))
            ) : (
              <li>No contacts yet.</li>
            )}
          </ul>
        )}
        <form onSubmit={handleAddContact} className="settings-form">
          <h3>Add contact</h3>
          <label>
            Name
            <input value={addForm.name} onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))} />
          </label>
          <label>
            Phone
            <input
              type="tel"
              value={addForm.phone}
              onChange={(e) => setAddForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </label>
          <button type="submit" disabled={addContactMutation.isLoading}>
            {addContactMutation.isLoading ? "Saving…" : "Add contact"}
          </button>
        </form>
        {formError && <p className="error-text">{formError}</p>}
      </div>
    </div>
  );
}

export default SettingsPage;
