import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { SiteSettingsProvider } from './contexts/SiteSettingsContext';
import { PaymentMethodsProvider } from './contexts/PaymentMethodsContext';
import { PartnersProvider } from './contexts/PartnersContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import { useSyncDocumentLang } from './hooks/useSyncDocumentLang';

import LandingPage from './pages/Home/LandingPage';
import HomePage from './pages/Catalog/HomePage';
import ProductDetailPage from './pages/Catalog/ProductDetailPage';
import VariantDetailPage from './pages/Catalog/VariantDetailPage/VariantDetailPage';
import PageCatalogPage from './pages/Catalog/PageCatalogPage/PageCatalogPage';
import CartPage from './pages/Cart/CartPage';
import CheckoutPage from './pages/Checkout/CheckoutPage';
import CheckoutSuccessPage from './pages/Checkout/CheckoutSuccessPage';
import CheckoutErrorPage from './pages/Checkout/CheckoutErrorPage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/Auth/ResetPasswordPage';
import UnsubscribePage from './pages/Auth/UnsubscribePage';
import AccountPage from './pages/Account/AccountPage';
import OrdersPage from './pages/Account/OrdersPage';
import OrderDetailPage from './pages/Account/OrderDetailPage';
import FavoritesPage from './pages/Favorites/FavoritesPage';

function App() {
  useSyncDocumentLang();

  return (
    <BrowserRouter>
      <SiteSettingsProvider>
      <PaymentMethodsProvider>
      <PartnersProvider>
      <AuthProvider>
        <CartProvider>
          <FavoritesProvider>
            <Routes>
              {/* Public */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/catalog" element={<HomePage />} />
              <Route path="/product/:slug" element={<ProductDetailPage />} />
              <Route path="/variant/:id" element={<VariantDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/pages/:slug" element={<PageCatalogPage />} />
              <Route path="/:slug" element={<PageCatalogPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/unsubscribe" element={<UnsubscribePage />} />

              {/* Protected (Customer) */}
              <Route element={<ProtectedRoute />}>
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
                <Route path="/checkout/error" element={<CheckoutErrorPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/account/orders" element={<OrdersPage />} />
                <Route path="/account/orders/:id" element={<OrderDetailPage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </FavoritesProvider>
        </CartProvider>
      </AuthProvider>
      </PartnersProvider>
      </PaymentMethodsProvider>
      </SiteSettingsProvider>
    </BrowserRouter>
  );
}

export default App;
