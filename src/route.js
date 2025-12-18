import WorkSpaceLayout from "./WorkSpaceLayout.jsx";

const routes = [
  {
    path: "/chat",
    component: WorkSpaceLayout,
  },
  {
    path: "/chat/:chatId",
    component: WorkSpaceLayout,
  },
];

export default routes;
