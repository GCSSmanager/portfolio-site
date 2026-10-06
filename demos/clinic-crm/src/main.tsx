import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { AuthProvider } from "./components/auth/AuthProvider";
import { FeedbackProvider } from "./components/feedback";
import { siteBackHref } from "./demo/site";
import "./index.css";

// Зафиксировать страницу-источник до hash-навигации внутри демо.
siteBackHref();

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <FeedbackProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </FeedbackProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
