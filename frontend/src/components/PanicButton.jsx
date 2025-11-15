/**
 * Panic button UI that pulls location via useGeolocation and posts to /panic-alert.
 * Connects AuthContext trusted contacts -> backend SMS senders.
 */
import { useEffect, useRef, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { useGeolocation } from "../hooks/useGeolocation";
import { sendPanicAlert } from "../services/api";

function PanicButton({ disabled }) {
  const { user, recordAlert } = useAuth();
  const { coords, error: geoError } = useGeolocation();
  const [status, setStatus] = useState("idle");
  const [lastTimestamp, setLastTimestamp] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startCountdown = () => {
    setStatus("confirming");
    setCountdown(5);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          sendAlert();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelCountdown = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCountdown(0);
    setStatus("idle");
  };

  const sendAlert = async () => {
    setStatus("sending");
    try {
      const response = await sendPanicAlert({
        lat: coords?.lat,
        lng: coords?.lng,
        userId: user?.id,
      });
      setLastTimestamp(response.timestamp);
      recordAlert(response.timestamp);
      setStatus("sent");
      setToast("Alert sent to your trusted contacts");
      setTimeout(() => setToast(null), 5000);
    } catch (error) {
      console.error("panic error", error);
      setStatus("error");
    }
  };

  const handleClick = () => {
    if (disabled || status === "sending") return;
    if (status === "confirming") {
      return;
    }
    startCountdown();
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
      {status === "confirming" && (
        <div className="panic-confirm">
          <p>Alert will send in {countdown}s</p>
          <div>
            <button type="button" onClick={sendAlert} disabled={!coords}>
              Send now
            </button>
            <button type="button" onClick={cancelCountdown}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {status === "sent" && lastTimestamp && <p>Alert sent at {new Date(lastTimestamp).toLocaleTimeString()}</p>}
      {status === "error" && <p>Could not send alert. Try again.</p>}
      {!coords && !geoError && <p>Waiting for location permission…</p>}
      {geoError && <p>{geoError}</p>}
      {toast && <p>{toast}</p>}
    </div>
  );
}

export default PanicButton;
