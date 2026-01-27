import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminSignup from "./pages/admin/Auth/AdminSignup";
import AdminSignin from "./pages/admin/Auth/AdminSignin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import About from "./pages/About";
import TryItNow from "./pages/TryItNow";

function Layout({ children }) {
  const location = useLocation();

  // Hide Navbar & Footer on auth pages and ALL admin pages
  const shouldHideLayout = () => {
    const path = location.pathname;
    
    // Hide for auth pages
    if (["/login", "/register", "/try-it"].includes(path)) {
      return true;
    }
    
    // Hide for ALL admin pages (any route starting with /admin/)
    if (path.startsWith("/admin/")) {
      return true;
    }
    
    return false;
  };

  const hideLayout = shouldHideLayout();

  return (
    <>
      {!hideLayout && <Navbar />}
      <main>{children}</main>
      {!hideLayout && <Footer />}
    </>
  );
}

function App() {
  return (
    <Layout>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/about" element={<About />} />
        <Route path="/try-it" element={<TryItNow />} />
        
        {/* Admin Auth Routes */}
        <Route path="/admin/signup" element={<AdminSignup />} />
        <Route path="/admin/signin" element={<AdminSignin />} />
        
        {/* Protected Admin Routes */}
        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          } 
        />
        
        {/* Redirect root admin path to dashboard */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        
        {/* 404 Page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

// Simple 404 component
function NotFound() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '60vh',
      flexDirection: 'column',
      textAlign: 'center'
    }}>
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
    </div>
  );
}

export default App;