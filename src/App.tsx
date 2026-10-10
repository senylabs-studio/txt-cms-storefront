import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AuthGateProvider } from './contexts/AuthGateContext';
import { CartProvider } from './contexts/CartContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { StockNotificationProvider } from './contexts/StockNotificationContext';
import { SiteSettingsProvider } from './contexts/SiteSettingsContext';
import { PaymentMethodsProvider } from './contexts/PaymentMethodsContext';
import { PartnersProvider } from './contexts/PartnersContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import ChatWidget from './components/ChatWidget/ChatWidget';
import GlobalToast from './components/common/GlobalToast/GlobalToast';
import UnhandledApiErrorToaster from './components/common/UnhandledApiErrorToaster';
import ScrollToTop from './components/common/ScrollToTop';
import { useSyncDocumentLang } from './hooks/useSyncDocumentLang';
import { Suspense } from 'react';
import { lazyPage } from './utils/lazyPage';
import PageErrorBoundary from './components/common/PageErrorBoundary';
import PageFallback from './components/common/PageFallback';

import LandingPage from './pages/Home/LandingPage';
const HomePage = lazyPage(() => import('./pages/Catalog/HomePage'));
import ProductDetailPage from './pages/Catalog/ProductDetailPage';
import VariantDetailPage from './pages/Catalog/VariantDetailPage/VariantDetailPage';
import PageCatalogPage from './pages/Catalog/PageCatalogPage/PageCatalogPage';
const CartPage = lazyPage(() => import('./pages/Cart/CartPage'));
const GiftCardPage = lazyPage(() => import('./pages/GiftCard/GiftCardPage'));
const CheckoutPage = lazyPage(() => import('./pages/Checkout/CheckoutPage'));
const CheckoutSuccessPage = lazyPage(() => import('./pages/Checkout/CheckoutSuccessPage'));
const CheckoutErrorPage = lazyPage(() => import('./pages/Checkout/CheckoutErrorPage'));
const LoginPage = lazyPage(() => import('./pages/Auth/LoginPage'));
const RegisterPage = lazyPage(() => import('./pages/Auth/RegisterPage'));
const ForgotPasswordPage = lazyPage(() => import('./pages/Auth/ForgotPasswordPage'));
const ResetPasswordPage = lazyPage(() => import('./pages/Auth/ResetPasswordPage'));
const GuestAccessRequestPage = lazyPage(() => import('./pages/Auth/GuestAccessRequestPage'));
const GuestAccessVerifyPage = lazyPage(() => import('./pages/Auth/GuestAccessVerifyPage'));
const UnsubscribePage = lazyPage(() => import('./pages/Auth/UnsubscribePage'));
const NewsletterConfirmPage = lazyPage(() => import('./pages/Auth/NewsletterConfirmPage'));
const ConfirmEmailPage = lazyPage(() => import('./pages/Auth/ConfirmEmailPage'));
const AccountPage = lazyPage(() => import('./pages/Account/AccountPage'));
const OrdersPage = lazyPage(() => import('./pages/Account/OrdersPage'));
const OrderDetailPage = lazyPage(() => import('./pages/Account/OrderDetailPage'));
const FavoritesPage = lazyPage(() => import('./pages/Favorites/FavoritesPage'));
const BoardPage = lazyPage(() => import('./pages/Board/BoardPage'));

function App() {
  useSyncDocumentLang();

  return (
    <BrowserRouter>
      <ScrollToTop />
      <ToastProvider>
      <SiteSettingsProvider>
      <PaymentMethodsProvider>
      <PartnersProvider>
      <AuthProvider>
        <AuthGateProvider>
        <CartProvider>
          <FavoritesProvider>
          <StockNotificationProvider>
            {/* The landing, category and product pages are in the main bundle (what most visits
                open); the rest load on demand. */}
            <PageErrorBoundary>
            <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Public */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/catalog" element={<HomePage />} />
              <Route path="/product/:slug" element={<ProductDetailPage />} />
              <Route path="/variant/:id" element={<VariantDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/tarjeta-regalo" element={<GiftCardPage />} />
              <Route path="/pages/:slug" element={<PageCatalogPage />} />
              <Route path="/:slug" element={<PageCatalogPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/guest-access" element={<GuestAccessRequestPage />} />
              <Route path="/guest-access/verify" element={<GuestAccessVerifyPage />} />
              <Route path="/unsubscribe" element={<UnsubscribePage />} />
              <Route path="/newsletter/confirmar" element={<NewsletterConfirmPage />} />
              <Route path="/email/confirmar" element={<ConfirmEmailPage />} />
              <Route path="/email/cambio" element={<ConfirmEmailPage change />} />

              {/* Protected (Customer) */}
              <Route element={<ProtectedRoute />}>
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
                <Route path="/checkout/error" element={<CheckoutErrorPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/account/orders" element={<OrdersPage />} />
                <Route path="/account/orders/:id" element={<OrderDetailPage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="/board" element={<BoardPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
            </PageErrorBoundary>
            <ChatWidget />
            <GlobalToast />
            <UnhandledApiErrorToaster />
          </StockNotificationProvider>
          </FavoritesProvider>
        </CartProvider>
        </AuthGateProvider>
      </AuthProvider>
      </PartnersProvider>
      </PaymentMethodsProvider>
      </SiteSettingsProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
