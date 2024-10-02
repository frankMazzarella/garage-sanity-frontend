import { useEffect, useState } from "react";
import { IoWater, IoThermometer } from "react-icons/io5";
import {
  PiArrowFatLineDownFill,
  PiArrowFatLineUpFill,
  PiArrowsClockwiseBold,
} from "react-icons/pi";

import "./App.css";

const DOMAIN_PROD = "https://desired-mollusk-naturally.ngrok-free.app";
const DOMAIN_LOCAL = "http://localhost:4000";
const AUTH_TOKEN_KEY = "AUTH_TOKEN";
const STATUS_OPEN = "OPEN";
const STATUS_CLOSED = "CLOSED";
const STATUS_LOADING = "LOADING";

const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
const version = `v${process.env.REACT_APP_VERSION}`;
let statusEndpoint;
let toggleEndpoint;
let authenticateEndpoint;

if (process.env.NODE_ENV === "production") {
  statusEndpoint = `${DOMAIN_PROD}/api/v1/status`;
  toggleEndpoint = `${DOMAIN_PROD}/api/v1/toggle`;
  authenticateEndpoint = `${DOMAIN_PROD}/api/v1/authenticate`;
} else {
  statusEndpoint = `${DOMAIN_LOCAL}/api/v1/status`;
  toggleEndpoint = `${DOMAIN_LOCAL}/api/v1/toggle`;
  authenticateEndpoint = `${DOMAIN_LOCAL}/api/v1/authenticate`;
}

function App() {
  const [timer, setTimer] = useState("0000");
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date().getTime());
  const [doorStatusLeft, setDoorStatusLeft] = useState(STATUS_LOADING);
  const [doorStatusRight, setDoorStatusRight] = useState(STATUS_LOADING);
  const [environment, setEnvironment] = useState(null);
  const [authToken, setAuthToken] = useState(storedToken);
  const [toggleButtonDisabled, setToggleButtonDisabled] = useState(true);
  const [authButtonDisabled, setAuthButtonDisabled] = useState(false);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = new Date().getTime();
      const seconds = Math.round((now - lastUpdateTime) / 1000);
      const timeDisplay = seconds.toString().padStart(4, "0");
      setTimer(timeDisplay);
    }, 500);
    return () => clearInterval(intervalId);
  }, [lastUpdateTime]);

  useEffect(() => {
    async function queryGarageStatus() {
      try {
        const response = await fetch(statusEndpoint);
        const status = await response.json();
        updateGarageStatus(status);
      } catch (error) {
        handleFetchStatusError(error);
      }
    }
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        queryGarageStatus();
      }
    });
    queryGarageStatus();
  }, []);

  useEffect(() => {
    async function startLongPoll() {
      try {
        const response = await fetch(`${statusEndpoint}?longPoll=true`);
        const status = await response.json();
        updateGarageStatus(status);
        startLongPoll();
      } catch (error) {
        handleFetchStatusError(error);
        setTimeout(startLongPoll, 5000);
      }
    }
    startLongPoll();
  }, []);

  function handleFetchStatusError(error) {
    console.error(error);
    setToggleButtonDisabled(true);
    setAuthButtonDisabled(true);
    setDoorStatusLeft(STATUS_LOADING);
    setDoorStatusRight(STATUS_LOADING);
    setEnvironment(null);
  }

  function updateGarageStatus(status) {
    if (status.left === STATUS_OPEN) setDoorStatusLeft(STATUS_OPEN);
    if (status.left === STATUS_CLOSED) setDoorStatusLeft(STATUS_CLOSED);
    if (status.right === STATUS_OPEN) setDoorStatusRight(STATUS_OPEN);
    if (status.right === STATUS_CLOSED) setDoorStatusRight(STATUS_CLOSED);
    if (status.left === STATUS_CLOSED && status.right === STATUS_CLOSED) {
      setToggleButtonDisabled(true);
    } else {
      setToggleButtonDisabled(false);
    }
    setEnvironment(status.environment);
    setLastUpdateTime(new Date().getTime());
  }

  async function handleToggleButton() {
    setToggleButtonDisabled(true);
    try {
      const options = getFetchOptions({ token: authToken });
      const response = await fetch(toggleEndpoint, options);
      if (response.status === 200) {
        setTimeout(() => {
          if (
            doorStatusLeft === STATUS_OPEN ||
            doorStatusRight === STATUS_OPEN
          ) {
            setToggleButtonDisabled(false);
          }
        }, 15000);
      } else {
        setAuthToken(null);
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setToggleButtonDisabled(false);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function handleAuthenticateButton() {
    const password = prompt("Password");
    if (password) {
      setAuthButtonDisabled(true);
      try {
        const options = getFetchOptions({ password });
        const response = await fetch(authenticateEndpoint, options);
        const data = await response.json();
        if (data.token) {
          setAuthToken(data.token);
          localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        }
      } catch (error) {
        console.error(error);
      }
      setAuthButtonDisabled(false);
    }
  }

  function getFetchOptions(postBody) {
    return {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postBody),
    };
  }

  function renderStatusIcon(status) {
    switch (status) {
      case STATUS_LOADING:
        return <PiArrowsClockwiseBold className="status-icon" />;
      case STATUS_OPEN:
        return <PiArrowFatLineUpFill className="status-icon" />;
      case STATUS_CLOSED:
        return <PiArrowFatLineDownFill className="status-icon" />;
      default:
        return <PiArrowsClockwiseBold className="status-icon" />;
    }
  }

  return (
    <div className="container">
      <div className="status-container">
        <div className="timer-container">{timer}</div>
        <div className="status-item">{renderStatusIcon(doorStatusLeft)}</div>
        <div className="status-item">{renderStatusIcon(doorStatusRight)}</div>
        {environment &&
        !Number.isNaN(environment?.temperature) &&
        !Number.isNaN(environment?.humidity) ? (
          <div className="environment-container">
            <div>
              <IoThermometer className="environment-icon" />
              {environment.temperature}°F
            </div>
            <div>
              <IoWater className="environment-icon" />
              {environment.humidity}%
            </div>
          </div>
        ) : null}
        <div className="button-container">
          {authToken ? null : (
            <button
              disabled={authButtonDisabled}
              onClick={handleAuthenticateButton}
            >
              Authenticate
            </button>
          )}
          {authToken ? (
            <button
              disabled={toggleButtonDisabled}
              onClick={() => handleToggleButton()}
            >
              Toggle
            </button>
          ) : null}
        </div>
      </div>
      <div className="version">{version}</div>
    </div>
  );
}

export default App;
