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
  TypingIndicator,
} from "@chatscope/chat-ui-kit-react";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import { chatServiceHost, tenantServiceHost } from "@/app/config";
import styles from './Chat.module.css'

const Chat = ({ tenantId, userId,jwt }) => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [tenantAlias, setTenantAlias] = useState(""); 


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

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
    const handleCopy = (e) => {
      const text_only = document.getSelection().toString();
      const clipdata = e.clipboardData || window.clipboardData;
      clipdata.setData('text/plain', text_only); // Set plain text
      clipdata.setData('text/html', text_only);  // Avoid copying HTML elements
      e.preventDefault(); // Prevent default copy behavior
    };

    document.addEventListener('copy', handleCopy);

    return () => {
      document.removeEventListener('copy', handleCopy); // Cleanup on unmount
    };
  }, []);

  useEffect(() => {
    if (tenantId && userId) {
      connect();
    }
  }, [tenantId, userId]);

  return (
    <ChakraProvider>
      <Box height="calc(100dvh - 72px)" width="100%">
        <MainContainer style={{ height: '100%' }}>
          <ChatContainer style={{ height: '100%' }}>
            <MessageList
             typingIndicator={
              isReplying ? (
                <TypingIndicator content="AI agent is responding" />
              ) : null
            }>
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
                    <div className={styles["markdown-content"]}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </Message.CustomContent>
                  <Message.Footer sentTime={formatTimestamp(msg.timestamp)} />
                  <Avatar
                    src={msg.sender === userId ? "/user.png" : "/agent.png"}
                    name={msg.sender}
                  />
                </Message>
              ))}
            </MessageList>

           
            
            <MessageInput placeholder="Type your message here" onSend={sendMessage} attachButton={false} />
          </ChatContainer>
        </MainContainer>
      </Box>
    </ChakraProvider>
  );
};

export default Chat;