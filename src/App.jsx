import { Outlet, useLocation } from "react-router-dom";
import Header from "./components/Header.jsx";

export default function App() {
  const location = useLocation();

  return (
    <div className="app-root">
      <Header />
      <main className="app-main">
        {/* key forces minimal re-mount on route change */}
        <Outlet key={location.pathname} />
      </main>
    </div>
  );
}
