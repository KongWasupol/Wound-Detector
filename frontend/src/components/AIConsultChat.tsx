import { useState, useRef, useEffect } from "react";
import { api } from "../api/client.ts";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIConsultChatProps {
  woundId?: string;
  onClose: () => void;
}

export const AIConsultChat = ({ woundId, onClose }: AIConsultChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm an AI assistant here to help with wound care advice. What questions do you have?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await api.post("/patient/ai-consult", {
        message: userMessage,
        woundId,
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data.response },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, a connection error occurred. Please try again.",
        },
      ]);
    }

    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="ai-consult-chat">
      <div className="chat-header">
        <h3>🤖 AI Consultation</h3>
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.role === "assistant" && <span className="avatar">🤖</span>}
            <div className="content">{msg.content}</div>
            {msg.role === "user" && <span className="avatar">👤</span>}
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <span className="avatar">🤖</span>
            <div className="content typing">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your question here..."
          disabled={loading}
          rows={2}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}>
          {loading ? "..." : "Send"}
        </button>
      </div>

      <p className="disclaimer">
        ⚠️ This AI advice cannot replace consultation with a real doctor
      </p>
    </div>
  );
};
