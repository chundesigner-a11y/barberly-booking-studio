import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { RequireAuth, RequireShop } from "@/components/RequireAuth";
import Index from "@/pages/Index";
import LoginPage from "@/pages/Login";
import BarbersPage from "@/pages/Barbers";
import NotFound from "@/pages/NotFound";
import ShopOnboarding from "@/pages/shop/ShopOnboarding";
import ShopBookings from "@/pages/shop/ShopBookings";

const queryClient = new QueryClient();

// Routes: / · /login · /barbers (customer) · /shop + /shop/bookings (profiles.role = shop).
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
          <Route
            path="/shop"
            element={
              <RequireAuth>
                <RequireShop>
                  <ShopOnboarding />
                </RequireShop>
              </RequireAuth>
            }
          />
          <Route
            path="/shop/bookings"
            element={
              <RequireAuth>
                <RequireShop>
                  <ShopBookings />
                </RequireShop>
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
