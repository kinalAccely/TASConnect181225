import React from "react";
import TopHeaderLight from "./light/TopHeader.jsx";

export default function TopHeader(props) {
  const { theme = "light", ...rest } = props;
  return <TopHeaderLight {...rest} theme="light" />;
}
