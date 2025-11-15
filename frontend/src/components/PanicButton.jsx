import { useState } from "react";

import { useAuth } from "../context/AuthContext";
import { useGeolocation } from "../hooks/useGeolocation";
import { sendPanicAlert } from "../services/api";

function PanicButton({ disabled }) {
  const { user } = useAuth();
  const { coords, error: geoError } = useGeolocation();
  const [status, setStatus] = useState("idle");
  const [lastTimestamp, setLastTimestamp] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleClick = async () => {
    if (disabled || status === "sending") return;
    if (!confirmOpen) {
      setConfirmOpen(true);
      return;
    }
    setConfirmOpen(false);
    setStatus("sending");
    try {
      const response = await sendPanicAlert({
        lat: coords?.lat,
        lng: coords?.lng,
        userId: user?.id,
      });
      setLastTimestamp(response.timestamp);
      setStatus("sent");
    } catch (error) {
      console.error("panic error", error);
      setStatus("error");
    }
  };

  return (
    <div className="panic-wrapper">
      <button
        type="button"
        className={`panic-button ${status}`}
        onClick={handleClick}
        disabled={disabled || !coords}
      >
        Panic Button
      </button>
      {confirmOpen && (
        <div className="panic-confirm">
          <p>Send alert to your trusted contacts?</p>
          <div>
            <button type="button" onClick={handleClick} disabled={!coords}>
              Yes, send alert
            </button>
            <button type="button" onClick={() => setConfirmOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {status === "sent" && lastTimestamp && <p>Alert sent at {new Date(lastTimestamp).toLocaleTimeString()}</p>}
      {status === "error" && <p>Could not send alert. Try again.</p>}
      {!coords && !geoError && <p>Waiting for location permission…</p>}
      {geoError && <p>{geoError}</p>}
    </div>
  );
}

export default PanicButton;
