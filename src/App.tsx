import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { SiteProvider } from './context/SiteContext'
import { HomePage } from './pages/HomePage'
import { SeoHead } from './components/SeoHead'
import { CatalogPage } from './pages/CatalogPage'
import { CatalogOrProduct } from './pages/CatalogOrProduct'
import { ContactsPage } from './pages/ContactsPage'
import { ProductPage } from './pages/ProductPage'
import { AboutPage } from './pages/AboutPage'
import { PrivacyPage, TermsPage } from './pages/LegalPages'
import { FaqPage } from './pages/FaqPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { AdminApp } from './admin/AdminApp'
import './App.css'

export default function App() {
  return (
    <SiteProvider>
      <BrowserRouter>
        <SeoHead />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/catalog/:id" element={<CatalogOrProduct />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/:categorySlug/:productSlug" element={<ProductPage />} />
          <Route path="/:categorySlug" element={<CatalogPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </SiteProvider>
  )
}
