// Import React & Firebase SDK
import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, child, push } from "firebase/database";
import { nanoid } from "nanoid";

// Firebase config (use your own)
const firebaseConfig = {
  apiKey: "AIzaSyC7vg_MGjiVvbbvnBAPRLDXnzK4OWflrCw",
  authDomain: "panggameet-chat.firebaseapp.com",
  databaseURL: "https://panggameet-chat-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "panggameet-chat",
  storageBucket: "panggameet-chat.firebasestorage.app",
  messagingSenderId: "1027749522600",
  appId: "1:1027749522600:web:b34eed31a14e4eec10a69d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function App() {
  const [userId, setUserId] = useState(null);
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!userId) {
      // Generate random userId for guests
      setUserId(nanoid());
    }
  }, [userId]);

  useEffect(() => {
    if (userId && !waiting) {
      setWaiting(true);
      checkForMatch();
    }
  }, [userId, waiting]);

  // Function to check if there is a match in the queue
  async function checkForMatch() {
    const waitingRef = ref(db, "queue");
    const snapshot = await get(waitingRef);
    const queue = snapshot.val() || {};

    for (let key in queue) {
      const waitingUser = queue[key];
      if (waitingUser !== userId) {
        // Match found, create a session
        const sessionId = nanoid();
        await set(ref(db, `sessions/${sessionId}`), {
          users: [userId, waitingUser],
          messages: []
        });

        set(ref(db, `queue/${waitingUser}`), null); // Remove from waiting queue
        set(ref(db, `queue/${userId}`), null); // Remove from the queue
        setPartner(waitingUser);
        setWaiting(false);
        break;
      }
    }

    if (waiting) {
      set(ref(db, `queue/${userId}`), userId); // Keep user in queue if no match
    }
  }

  // Send a new message
  async function sendMessage() {
    if (message.trim()) {
      const sessionRef = ref(db, "sessions");
      const snapshot = await get(sessionRef);
      const sessionId = Object.keys(snapshot.val() || {}).find(session =>
        snapshot.val()[session].users.includes(userId) && snapshot.val()[session].users.includes(partner)
      );

      if (sessionId) {
        const messagesRef = ref(db, `sessions/${sessionId}/messages`);
        await push(messagesRef, { from: userId, text: message });
        setMessages(prev => [...prev, { from: userId, text: message }]);
        setMessage("");
      }
    }
  }

  // Leave the current chat session
  async function handleLeave() {
    const sessionRef = ref(db, "sessions");
    const snapshot = await get(sessionRef);
    const sessionId = Object.keys(snapshot.val() || {}).find(session =>
      snapshot.val()[session].users.includes(userId) && snapshot.val()[session].users.includes(partner)
    );

    if (sessionId) {
      await set(ref(db, `sessions/${sessionId}`), null);
    }

    setPartner(null);
    setWaiting(true);
    checkForMatch(); // Find a new partner
  }

  // Handle message input change
  function handleChange(event) {
    setMessage(event.target.value);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
      <header className="w-full max-w-xl flex items-center justify-between py-3">
        <h1 className="text-2xl font-bold">PanggaMeet</h1>
      </header>

      <main className="w-full max-w-xl flex-1 flex flex-col items-center">
        {!partner && (
          <div className="mt-20 text-center">
            <p className="mb-4">You're waiting for a random partner to chat...</p>
            <button
              onClick={handleLeave}
              className="px-6 py-2 rounded bg-blue-500 text-white"
            >
              Leave / Next
            </button>
          </div>
        )}

        {partner && (
          <div className="mt-6 w-full">
            <div className="p-6 bg-white rounded shadow">
              <h2 className="text-xl font-semibold mb-2">Chat with {partner}</h2>
              <div className="mb-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`text-sm ${msg.from === userId ? "text-blue-500" : "text-gray-600"}`}
                  >
                    <strong>{msg.from === userId ? "You" : partner}:</strong> {msg.text}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={message}
                  onChange={handleChange}
                  placeholder="Type a message..."
                  className="border p-2 rounded w-full"
                />
                <button
                  onClick={sendMessage}
                  className="bg-blue-500 text-white p-2 rounded"
                >
                  Send
                </button>
              </div>
            </div>

            <button
              onClick={handleLeave}
              className="mt-4 px-6 py-2 rounded bg-red-500 text-white"
            >
              Leave Chat
            </button>
          </div>
        )}
      </main>

      <footer className="py-4 text-sm text-gray-500">Random chat powered by PanggaMeet</footer>
    </div>
  );
}
