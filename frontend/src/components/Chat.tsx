import React, { useState } from "react";
import { sendChatMessage } from "../api/f1Api";

export default function Chat() {
    const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
    const [input, setInput] = useState("");

    const handleSend = async () => {
        if (!input.trim()) return;
        setMessages([...messages, {role: "user", content: input}]);
        const res = await sendChatMessage(input);
        setMessages(msgs => [...msgs, {role: "assistant", content: res.reply}]);
        setInput("");
    };

    return (
        <div>
            <div>
                {messages.map((msg, idx) => (
                    <div key={idx} style={{textAlign: msg.role === "user" ? "right" : "left"}}>
                        <b>{msg.role === "user" ? "Ty" : "AI"}:</b> {msg.content}
                    </div>
                ))}
            </div>
            <input value={input} onChange={e => setInput(e.target.value)} />
            <button onClick={handleSend}>Wyślij</button>
        </div>
    );
}
