import { useEffect, useRef, useState } from "react";
import "./App.css";
import { io, Socket } from "socket.io-client";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);

  const socketRef = useRef<Socket>(null);
  const xtermRef = useRef<Terminal>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = (socketRef.current = io("http://localhost:3000"));

    socket.on("message", (message) => {
      setMessages((prev) => [...prev, message]);
    });
    socket.on("output", (data) => {
      xtermRef.current?.write(data);
    });

    const xterm = (xtermRef.current = new Terminal({
      cols: 80,
      rows: 30,
      theme: {
        background: "#222",
        foreground: "#fff",
      },
    }));

    xterm.onResize(() => {
      socket.emit("resize", { cols: xterm.cols, rows: xterm.rows });
    });
    xterm.onData((data) => {
      socket.emit("input", data);
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    const observer = new ResizeObserver(() => {
      fitAddon.fit();
    });

    // 解决 Uncaught TypeError: Cannot read properties of undefined (reading 'dimensions')
    const rafId = requestAnimationFrame(() => {
      if (!containerRef.current) return;
      xterm.open(containerRef.current);
      observer.observe(containerRef.current); // 触发一次 fit
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      xterm.dispose();
      xtermRef.current = null;
      observer.disconnect();
      cancelAnimationFrame(rafId);
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
      <div className="terminal-container" ref={containerRef}></div>

      <div>
        <input value={message} onChange={(e) => setMessage(e.target.value)} />
        <button onClick={send}>Send</button>
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
