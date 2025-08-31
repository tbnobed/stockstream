import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import Sales from "@/pages/sales";
import Reports from "@/pages/reports";
import Associates from "@/pages/associates";
import Suppliers from "@/pages/suppliers";
import CategoryManagement from "@/pages/category-management";
import LabelDesigner from "@/pages/label-designer";
import Login from "@/pages/login";
import MobileSales from "@/pages/mobile-sales";
import Receipt from "@/pages/receipt";
import VolunteerSales from "@/pages/volunteer-sales";
import Sidebar from "@/components/layout/sidebar";

// Mobile detection utility
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  
  // Also check for touch screen and screen size (16:9 mobile aspect ratios)
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const screenRatio = window.screen.width / window.screen.height;
  const isMobileRatio = screenRatio < 1 || (screenRatio > 1.7 && screenRatio < 1.8); // Portrait or 16:9 landscape
  
  return isMobileUserAgent || (isTouchDevice && window.innerWidth < 1024);
};

function MobileRedirect({ userRole }: { userRole: string }) {
  const [location, navigate] = useLocation();
  
  useEffect(() => {
    if (!isMobileDevice()) return;
    
    // Check if user just logged in (came from login page or initial load)
    const isPostLogin = sessionStorage.getItem('justLoggedIn') === 'true';
    const isInitialLoad = !sessionStorage.getItem('hasNavigated');
    
    // For associates: always redirect to mobile-sales on login or initial load
    if (userRole === 'associate' && (isPostLogin || (isInitialLoad && location === '/'))) {
      navigate('/mobile-sales');
      sessionStorage.removeItem('justLoggedIn');
      sessionStorage.setItem('hasNavigated', 'true');
      return;
    }
    
    // For admins: redirect to mobile-sales on login or initial load unless explicitly navigating
    if (userRole === 'admin' && (isPostLogin || (isInitialLoad && location === '/'))) {
      navigate('/mobile-sales');
      sessionStorage.removeItem('justLoggedIn');
      sessionStorage.setItem('hasNavigated', 'true');
      return;
    }
    
    // Mark that user has navigated to prevent auto-redirect on future navigation
    if (location !== '/login' && !isPostLogin) {
      sessionStorage.setItem('hasNavigated', 'true');
    }
  }, [location, navigate, userRole]);
  
  return null;
}

function AuthenticatedApp() {
  const { user } = useAuth();
  const userRole = (user as any)?.role || 'associate';
  const [location] = useLocation();
  
  // Check if we're on mobile sales page - use full screen layout
  const isMobileSalesPage = location === '/mobile-sales';
  
  if (isMobileSalesPage) {
    return (
      <div className="min-h-screen bg-background">
        <MobileSales />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <MobileRedirect userRole={userRole} />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/inventory" component={Inventory} />
          <Route path="/sales" component={Sales} />
          <Route path="/mobile-sales" component={MobileSales} />
          <Route path="/labels" component={LabelDesigner} />
          <Route path="/receipt/:token" component={Receipt} />
          {userRole === 'admin' && (
            <>
              <Route path="/reports" component={Reports} />
              <Route path="/associates" component={Associates} />
              <Route path="/suppliers" component={Suppliers} />
              <Route path="/categories" component={CategoryManagement} />
            </>
          )}
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/receipt/:token" component={Receipt} />
        <Route path="/volunteer-sales" component={VolunteerSales} />
        <Route>
          <Login />
        </Route>
      </Switch>
    );
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
