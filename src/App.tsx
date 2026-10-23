import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import Index from "@/pages/Index";
import LoginPage from "@/pages/Login";
import BarbersPage from "@/pages/Barbers";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

// The only routes are /, /login and /barbers (no /app, no /dashboard).
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/barbers"
            element={
              <RequireAuth>
                <BarbersPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}
