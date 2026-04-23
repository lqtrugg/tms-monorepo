import { createBrowserRouter, redirect } from "react-router";
import { Dashboard } from "./pages/Dashboard";
import { Students } from "./pages/Students";
import { StudentDetail } from "./pages/StudentDetail";
import { Classes } from "./pages/Classes";
import { Sessions } from "./pages/Sessions";
import { Attendance } from "./pages/Attendance";
import { Transactions } from "./pages/Transactions";
import { Topics } from "./pages/Topics";
import { TopicStanding } from "./pages/TopicStanding";
import { Reports } from "./pages/Reports";
import { Messaging } from "./pages/Messaging";
import { Login } from "./pages/Login";
import { Layout } from "./components/Layout";

function hasAccessToken(): boolean {
  return Boolean(localStorage.getItem("tms_access_token"));
}

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
    loader: () => {
      if (hasAccessToken()) {
        return redirect("/");
      }

      return null;
    },
  },
  {
    path: "/",
    Component: Layout,
    loader: () => {
      if (!hasAccessToken()) {
        return redirect("/login");
      }

      return null;
    },
    children: [
      { index: true, Component: Dashboard },
      { path: "students", Component: Students },
      { path: "students/:id", Component: StudentDetail },
      { path: "classes", Component: Classes },
      { path: "sessions", Component: Sessions },
      { path: "attendance", Component: Attendance },
      { path: "transactions", Component: Transactions },
      { path: "topics", Component: Topics },
      { path: "topics/:id/standing", Component: TopicStanding },
      { path: "messaging", Component: Messaging },
      { path: "reports", Component: Reports },
    ],
  },
]);
