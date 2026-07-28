import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import App from "./App";
import InvoicesPage from "./pages/InvoicesPage";
import InvoiceEditorPage from "./pages/InvoiceEditorPage";
import ClientsPage from "./pages/ClientsPage";
import SettingsPage from "./pages/SettingsPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <InvoicesPage /> },
      { path: "invoices/new", element: <InvoiceEditorPage /> },
      { path: "invoices/:id", element: <InvoiceEditorPage /> },
      { path: "clients", element: <ClientsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
