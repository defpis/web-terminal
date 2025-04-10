import { useEffect, useRef, useState } from "react";
import "./App.css";
import { io, Socket } from "socket.io-client";

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);

  const socketRef = useRef<Socket>(null);

  useEffect(() => {
    const socket = (socketRef.current = io("http://localhost:3000"));

    socket.on("message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const send = () => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("message", message, (ack: any) => {
      console.log(ack);
    });
    setMessage("");
  };

  return (
    <>
      <h1>Hello World!</h1>

      <div>
        <input value={message} onChange={(e) => setMessage(e.target.value)} />
        <button onClick={send}>发送</button>
      </div>

      <div>
        {messages.map((msg, idx) => (
          <p key={idx}>{msg}</p>
        ))}
      </div>
    </>
  );
}

export default App;
