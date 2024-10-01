"use client"
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import ReactMarkdown from 'react-markdown';
import React, { useState, useEffect, useRef } from "react";
import { ChakraProvider, Box } from "@chakra-ui/react";
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

const Chat = ({ tenantId, userId }) => {
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

  const sendMessage = (message) => {
    if (message.trim() !== "" && clientRef.current) {
      const chatMessage = {
        sender: userId,
        content: message,
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

  useEffect(() => {
    if (tenantId && userId) {
      connect();
    }
  }, [tenantId, userId]);

  return (
    <ChakraProvider>
      <Box height="calc(100vh - 72px)" width="100%">
        <MainContainer style={{ height: '100%' }}>
          <ChatContainer style={{ height: '100%' }}>
            <MessageList>
              {!isConnected ? (
                <Message model={{
                  message: "Connecting to customer service...",
                  direction: "incoming",
                  position: "single"
                }} />
              ) : (
                messages.map((msg, idx) => (
                  <Message
                    key={idx}
                    model={{
                      message: msg.content,
                      sentTime: "just now",
                      sender: msg.sender,
                      direction: msg.sender === userId ? "outgoing" : "incoming",
                      position: "normal",
                    }}
                  >
                    <Avatar src={msg.sender === userId ? "/user.png" : "/agent.png"} name={msg.sender} />
                  </Message>
                ))
              )}
            </MessageList>
            <MessageInput placeholder="Type your message here" onSend={sendMessage} attachButton={false} />
          </ChatContainer>
        </MainContainer>
      </Box>
    </ChakraProvider>
  );
};

export default Chat;