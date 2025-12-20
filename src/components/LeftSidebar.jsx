import React from "react";
import LeftSidebarLight from "./light/LeftSidebar.jsx";

export default function LeftSidebar(props) {
  const { theme = "light", ...rest } = props;
  return <LeftSidebarLight {...rest} theme="light" />;
}
