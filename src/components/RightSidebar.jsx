import React from "react";
import RightSidebarLight from "./light/RightSidebar.jsx";

export default function RightSidebar(props) {
  const { theme = "light", ...rest } = props;
  return <RightSidebarLight {...rest} theme="light" />;
}
