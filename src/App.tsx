import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, RequireAuth, RequireShop } from "@/components/RequireAuth";
import Index from "@/pages/Index";
import LoginPage from "@/pages/Login";
import BarbersBrowse from "@/pages/BarbersBrowse";
import BarberDetail from "@/pages/BarberDetail";
import MyBookings from "@/pages/MyBookings";
import NotFound from "@/pages/NotFound";
import ShopOnboarding from "@/pages/shop/ShopOnboarding";
import ShopBookings from "@/pages/shop/ShopBookings";

const queryClient = new QueryClient();

// Routes:
//   public   · /  · /login · /barbers (browse) · /barbers/:id (detail + Book dialog)
//   customer · /bookings (my bookings)
//   shop     · /shop · /shop/bookings   (profiles.role = 'shop')
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/barbers" element={<BarbersBrowse />} />
            <Route path="/barbers/:id" element={<BarberDetail />} />
            <Route
              path="/bookings"
              element={
                <RequireAuth>
                  <MyBookings />
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
      </AuthProvider>
    </QueryClientProvider>
  );
}
