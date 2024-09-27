"use client"
import React, { useState, useRef } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import ReactMarkdown from 'react-markdown';
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  Avatar,
  TypingIndicator
} from "@chatscope/chat-ui-kit-react";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import { chatServiceHost, tenantServiceHost } from "@/app/config";
import styles from './Chat.module.css'

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [tenantAlias, setTenantAlias] = useState(""); 
  const [tenantId, setTenantId] = useState("");
  const [userId, setUserId] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const clientRef = useRef(null);
  
  const onMessageReceived = (payload) => {
    const message = JSON.parse(payload.body);
    console.log("Received message:", message);
    if (message.type === "CHAT") {
      setMessages((prevMessages) => [...prevMessages, message]);
    }
    setIsReplying(message.type === "ACKNOWLEDGEMENT");
  };

  const sendMessage = () => {
    if (messageInput.trim() !== "" && clientRef.current) {
      const chatMessage = {
        sender: userId,
        content: messageInput,
        type: "CHAT",
        tenant_id: tenantId,
        receiver: null,
        user_type: "customer",
        timestamp: new Date().toISOString(),
      };

      setMessages((prevMessages) => [...prevMessages, chatMessage]);

      clientRef.current.publish({
        destination: "/app/chat.sendMessage",
        body: JSON.stringify(chatMessage),
      });

      setMessageInput("");
    }
  };

  const fetchTenantId = async (alias) => {
    try {
      const response = await fetch(`${tenantServiceHost}/api/v1/tenants/find?alias=${alias}`);
      const data = await response.json();
      if (data && data.data) {
        setTenantId(data.data.tenant_id);
      } else {
        alert("Tenant not found");
      }
    } catch (error) {
      console.error("Failed to fetch tenant ID:", error);
      alert("Failed to fetch tenant ID. Please try again.");
    }
  };

  const connect = () => {
    const socketUrl = chatServiceHost + `/ws?user=${userId}`;
    const socket = new SockJS(socketUrl);

    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("Connected");

        client.subscribe("/user/queue/messages", onMessageReceived);

        client.publish({
          destination: "/app/chat.addUser",
          body: JSON.stringify({
            sender: userId,
            type: "JOIN",
            tenant_id: tenantId,
            user_type: "customer",
          }),
        });

        setIsConnected(true);
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
  };

  const handleConnectClick = async () => {
    if (!tenantAlias || !userId) {
      alert("Please enter both Tenant Alias and User ID");
      return;
    }

    await fetchTenantId(tenantAlias);
    if (tenantId) {
      connect();
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ height: "500px", width: "100%" }}>
      <MainContainer>
        {!isConnected ? (
          <div style={{ padding: "20px" }}>
            <h2>Customer Chat</h2>
            <input
              type="text"
              placeholder="Enter Tenant Alias"
              value={tenantAlias}
              onChange={(e) => setTenantAlias(e.target.value)}
              style={{
                marginRight: "10px",
                marginBottom: "10px",
                padding: "5px",
              }}
            />
            <input
              type="text"
              placeholder="Enter User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              style={{
                marginRight: "10px",
                marginBottom: "10px",
                padding: "5px",
              }}
            />
            <button
              onClick={handleConnectClick}
              style={{ padding: "5px 10px" }}
            >
              Connect
            </button>
          </div>
        ) : (
          <ChatContainer>
            <MessageList>
              {isReplying && <TypingIndicator content="AI agent is responding" />}
              {messages.map((msg, idx) => (
                <Message
                  key={idx}
                  model={{
                    message: msg.content,
                    sentTime: formatTimestamp(msg.timestamp) || "just now",
                    sender: msg.sender,
                    direction: msg.sender === userId ? "outgoing" : "incoming",
                    position: "normal",
                  }}
                >
                  <Message.Header sender={msg.sender} />
                  <Message.CustomContent>
                    <ReactMarkdown className={styles.markdown-content}>{msg.content}</ReactMarkdown>
                  </Message.CustomContent>
                  <Message.Footer sentTime={formatTimestamp(msg.timestamp)} />
                  <Avatar
                    src={msg.sender === userId ? "/user.png" : "/agent.png"}
                    name={msg.sender}
                  />
                </Message>
              ))}
            </MessageList>
            <MessageInput
              placeholder="Type your message here (Markdown supported)"
              value={messageInput}
              onChange={(val) => setMessageInput(val)}
              onSend={sendMessage}
              attachButton={false}
            />
          </ChatContainer>
        )}
      </MainContainer>
    </div>
  );
};

export default Chat;