import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router";
import { AppShell, RequireRole } from "@/components/layout/AppShell";
import { RootLayout } from "@/components/layout/PageTransition";
import { PageLoader } from "@/components/PageLoader";
import { RouteError } from "@/pages/RouteError";

const Landing = lazy(() => import("@/pages/Landing"));
const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Rooms = lazy(() => import("@/pages/rooms/Rooms"));
const RoomDetail = lazy(() => import("@/pages/rooms/RoomDetail"));
const Tenants = lazy(() => import("@/pages/Tenants"));
const Contracts = lazy(() => import("@/pages/contracts/Contracts"));
const NewContract = lazy(() => import("@/pages/contracts/NewContract"));
const ContractDetail = lazy(() => import("@/pages/contracts/ContractDetail"));
const Checkout = lazy(() => import("@/pages/contracts/Checkout"));
const Meters = lazy(() => import("@/pages/Meters"));
const Invoices = lazy(() => import("@/pages/invoices/Invoices"));
const BillingRun = lazy(() => import("@/pages/invoices/BillingRun"));
const InvoiceDetail = lazy(() => import("@/pages/invoices/InvoiceDetail"));
const Payments = lazy(() => import("@/pages/Payments"));
const Maintenance = lazy(() => import("@/pages/Maintenance"));
const Audit = lazy(() => import("@/pages/Audit"));
const Settings = lazy(() => import("@/pages/Settings"));
const Portal = lazy(() => import("@/pages/portal/Portal"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const s = (el: ReactNode) => <Suspense fallback={<PageLoader />}>{el}</Suspense>;
const owner = (el: ReactNode) => <RequireRole roles={["OWNER"]}>{s(el)}</RequireRole>;

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
  { index: true, element: s(<Landing />) },
  { path: "login", element: s(<Login />) },
  {
    path: "app",
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: s(<Dashboard />) },
      { path: "rooms", element: s(<Rooms />) },
      { path: "rooms/:id", element: s(<RoomDetail />) },
      { path: "tenants", element: s(<Tenants />) },
      { path: "contracts", element: s(<Contracts />) },
      { path: "contracts/new", element: s(<NewContract />) },
      { path: "contracts/:id", element: s(<ContractDetail />) },
      { path: "contracts/:id/checkout", element: s(<Checkout />) },
      { path: "meters", element: s(<Meters />) },
      { path: "invoices", element: s(<Invoices />) },
      { path: "invoices/billing", element: s(<BillingRun />) },
      { path: "invoices/:id", element: s(<InvoiceDetail />) },
      { path: "payments", element: s(<Payments />) },
      { path: "maintenance", element: s(<Maintenance />) },
      { path: "audit", element: owner(<Audit />) },
      { path: "settings", element: owner(<Settings />) },
    ],
  },
  {
    path: "portal",
    element: <RequireRole roles={["TENANT"]}>{s(<Portal />)}</RequireRole>,
    errorElement: <RouteError />,
  },
  { path: "*", element: s(<NotFound />) },
    ],
  },
]);
