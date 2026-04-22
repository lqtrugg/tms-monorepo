import { createBrowserRouter } from "react-router";
import { Dashboard } from "./pages/Dashboard";
import { Students } from "./pages/Students";
import { Classes } from "./pages/Classes";
import { Attendance } from "./pages/Attendance";
import { Transactions } from "./pages/Transactions";
import { Codeforces } from "./pages/Codeforces";
import { Reports } from "./pages/Reports";
import { Discord } from "./pages/Discord";
import { Login } from "./pages/Login";
import { Me } from "./pages/Me";
import { Layout } from "./components/Layout";
import { PendingArchive } from "./pages/PendingArchive";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/me",
    Component: Me,
  },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "students", Component: Students },
      { path: "classes", Component: Classes },
      { path: "attendance", Component: Attendance },
      { path: "transactions", Component: Transactions },
      { path: "pending-archive", Component: PendingArchive },
      { path: "codeforces", Component: Codeforces },
      { path: "discord", Component: Discord },
      { path: "reports", Component: Reports },
    ],
  },
]);
