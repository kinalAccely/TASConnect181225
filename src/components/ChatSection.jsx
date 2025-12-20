import React from "react";
import ChatSectionLight from "./light/ChatSection.jsx";

export default function ChatSection(props) {
  const { theme = "light", ...rest } = props;
  return <ChatSectionLight {...rest} theme="light" />;
}
