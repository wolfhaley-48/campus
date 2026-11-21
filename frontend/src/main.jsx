import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "framer-motion";

import "@fontsource-variable/golos-text";
import "./styles/app.css";
import "./styles/transitions.css";

import App from "./App";
import { AuthProvider } from "./auth";
import { NavigationProvider } from "./navigation";
import { ToastProvider } from "./toast";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <BrowserRouter useTransitions={false}>
        <NavigationProvider>
          <ToastProvider>
            <AuthProvider>
              <AppErrorBoundary><App /></AppErrorBoundary>
            </AuthProvider>
          </ToastProvider>
        </NavigationProvider>
      </BrowserRouter>
    </MotionConfig>
  </React.StrictMode>,
);
