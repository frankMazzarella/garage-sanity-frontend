import { useEffect, useState } from 'react';

import './App.css';

function App() {
  const UNICODE_UP = '↑';
  const UNICODE_DOWN = '↓';
  const UNICODE_LOADING = '⟳';
  const UNICODE_ERROR = '⊗';
  
  const statusEndpoint = process.env.NODE_ENV === 'production' ?
    'https://desired-mollusk-naturally.ngrok-free.app/api/v1/status' : 
    'http://localhost:4000/api/v1/status'

  const [statusLeft, setStatusLeft] = useState(UNICODE_LOADING);
  const [statusRight, setStatusRight] = useState(UNICODE_LOADING);

  useEffect(() => {
    async function queryStatus() {
      try {
        const response = await fetch(statusEndpoint);
        const status = await response.json();
        setStatusLeft(status.left === 'up' ? UNICODE_UP : UNICODE_DOWN);
        setStatusRight(status.right === 'up' ? UNICODE_UP : UNICODE_DOWN);
      } catch (error) {
        console.error(error);
        setStatusLeft(UNICODE_ERROR);
        setStatusRight(UNICODE_ERROR);
      }
    }
    queryStatus();
  }, [statusEndpoint]);

  return (
    <div className="container">
      <div className="status">
        <span>{ statusLeft }</span>
        <span>{ statusRight }</span>
      </div>
    </div>
  );
}

export default App;
