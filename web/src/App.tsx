import { useEffect, useRef, useState } from "react";
import "./App.css";
import { io, Socket } from "socket.io-client";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { Button, Form, Input, Select } from "@arco-design/web-react";

function App() {
  const [messages, setMessages] = useState<string[]>([]);

  const socketRef = useRef<Socket>(null);
  const xtermRef = useRef<Terminal>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = (socketRef.current = io("http://localhost:3000"));

    socket.on("sftp", (message) => {
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

  const send = ({ type, data }: { type: string; data: string }) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit(type, data, (ack: any) => {
      console.log(ack);
    });
  };

  return (
    <>
      <div className="terminal-container" ref={containerRef}></div>

      <Form
        layout="inline"
        onSubmit={(value) => {
          send(value);
        }}
      >
        <Form.Item label="消息类型" field={"type"}>
          <Select
            style={{ width: 200 }}
            options={[
              {
                label: "sftp-list",
                value: "sftp-list",
              },
              {
                label: "sftp-read",
                value: "sftp-read",
              },
            ]}
          ></Select>
        </Form.Item>
        <Form.Item label="消息内容" field={"data"}>
          <Input />
        </Form.Item>

        <Button htmlType="submit">发送</Button>
      </Form>

      <div>
        {messages.map((msg, idx) => (
          <p key={idx}>{msg}</p>
        ))}
      </div>
    </>
  );
}

export default App;
