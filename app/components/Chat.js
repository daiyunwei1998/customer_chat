"use client";

import React, { useState, useEffect, useRef } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

const chatServiceHost = process.env.CHAT_SERVICE_HOST || 'http://localhost:8080';


const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const clientRef = useRef(null);

  const tenantId = "tenant1";
  const userId = "customer1"; // Ensure this is unique per customer

  useEffect(() => {
    // Pass the userId as a query parameter for the handshake handler
    const socketUrl = chatServiceHost + `ws?user=${userId}`;
    const socket = new SockJS(socketUrl);

    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("Connected");
        // Subscribe to user-specific messages
        client.subscribe("/user/queue/messages", onMessageReceived);

        // Notify server that customer has joined
        client.publish({
          destination: "/app/chat.addUser",
          body: JSON.stringify({
            sender: userId,
            type: "JOIN",
            tenant_id: tenantId,
            user_type: "customer",
          }),
        });
      },
      onStompError: (frame) => {
        console.error("Broker reported error: " + frame.headers["message"]);
        console.error("Additional details: " + frame.body);
      },
      debug: (str) => {
        console.log(str);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
      }
    };
  }, [tenantId, userId]);

  const onMessageReceived = (payload) => {
    const message = JSON.parse(payload.body);
    console.log("Received message:", message);
    setMessages((prevMessages) => [...prevMessages, message]);
  };

  const sendMessage = () => {
    if (messageInput.trim() !== "" && clientRef.current) {
      const chatMessage = {
        sender: userId,
        content: messageInput,
        type: "CHAT",
        tenant_id: tenantId,
        receiver: "agent1", // Specify the agent's ID
        user_type: "customer",
      };

      // Add the message to the chat immediately
      setMessages((prevMessages) => [
        ...prevMessages,
        chatMessage, // Display own message instantly
      ]);

      // Publish the message to the server
      clientRef.current.publish({
        destination: "/app/chat.sendMessage",
        body: JSON.stringify(chatMessage),
      });

      // Clear the input field after sending the message
      setMessageInput("");
    }
  };

  return (
    <div>
      <h2>Customer Chat</h2>
      <div
        style={{
          border: "1px solid #ccc",
          height: "300px",
          overflowY: "scroll",
          padding: "10px",
        }}
      >
        {messages.map((msg, idx) => (
          <div key={idx} style={{ marginBottom: "10px" }}>
            <strong>{msg.sender}: </strong>
            <span>{msg.content}</span>
          </div>
        ))}
      </div>
      <input
        type="text"
        placeholder="Type your message..."
        value={messageInput}
        onChange={(e) => setMessageInput(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === "Enter") sendMessage();
        }}
        style={{ width: "80%", padding: "10px" }}
      />
      <button onClick={sendMessage} style={{ padding: "10px" }}>
        Send
      </button>
    </div>
  );
};

export default Chat;
