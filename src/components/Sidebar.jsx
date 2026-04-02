import { useMemo, useState } from 'react';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Package,
  User,
} from 'lucide-react';

const Sidebar = ({
  currentView,
  setCurrentView,
  children,
  currentUser,
  onLogout,
  menuItems = [],
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const initialExpandedMenus = useMemo(
    () =>
      menuItems.reduce((acc, item) => {
        if (item.expandable) {
          acc[item.id] = item.submenu?.some((subItem) => subItem.view === currentView) || false;
        }
        return acc;
      }, {}),
    [currentView, menuItems]
  );

  const [expandedMenus, setExpandedMenus] = useState(initialExpandedMenus);

  const toggleMenu = (menuId) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleNavigation = (view) => {
    setCurrentView(view);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const renderMenuItem = (item) => {
    if (item.expandable) {
      const isExpanded =
        expandedMenus[item.id] ?? item.submenu?.some((subItem) => subItem.view === currentView);
      const Icon = item.icon;

      return (
        <div key={item.id}>
          <button
            onClick={() => toggleMenu(item.id)}
            className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-gray-700 transition-colors hover:bg-gray-100"
          >
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </div>
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          {isExpanded ? (
            <div className="ml-4 mt-1 space-y-1">
              {item.submenu.map((subItem) => {
                const SubIcon = subItem.icon;
                const isActive = currentView === subItem.view;

                return (
                  <button
                    key={subItem.id}
                    onClick={() => handleNavigation(subItem.view)}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-50 font-medium text-blue-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <SubIcon className="h-4 w-4" />
                    <span>{subItem.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      );
    }

    const Icon = item.icon;
    const isActive = currentView === item.view;

    return (
      <button
        key={item.id}
        onClick={() => handleNavigation(item.view)}
        className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
          isActive ? 'bg-blue-600 font-medium text-white' : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <Icon className="h-5 w-5" />
        <span className="font-medium">{item.label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center border-b border-gray-200 bg-white px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            title={isSidebarOpen ? 'Hide navigation' : 'Show navigation'}
          >
            <Menu className="h-6 w-6 text-gray-600" />
          </button>

          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
            <Package className="h-6 w-6 text-white" />
          </div>

          <div>
            <h1 className="text-lg font-semibold text-gray-900">Card Inventory management System</h1>
            <p className="text-xs text-gray-400">Role-based demo workspace</p>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <button className="relative rounded-lg p-2 transition-colors hover:bg-gray-100">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-700 transition-colors hover:bg-gray-100"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium text-gray-900">{currentUser?.name || 'Guest'}</p>
                <p className="text-xs text-gray-400">{currentUser?.roleLabel || 'No role'}</p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-gray-500 md:block" />
            </button>

            {showProfileMenu ? (
              <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
                <div className="border-b border-gray-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{currentUser?.name}</p>
                      <p className="text-sm text-gray-500">{currentUser?.roleLabel}</p>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 text-sm text-gray-500">
                  Username: <span className="font-medium text-gray-900">{currentUser?.username}</span>
                </div>

                <div className="border-t border-gray-200 pt-2">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={`fixed bottom-0 left-0 top-16 z-40 flex w-72 flex-col border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
          {menuItems.map((item) => renderMenuItem(item))}
        </nav>
      </div>

      <div
        className={`mt-16 flex-1 overflow-auto transition-all duration-300 ${
          isSidebarOpen ? 'ml-72' : 'ml-0'
        }`}
      >
        <div className="p-6 lg:p-8">{children}</div>
      </div>

      {isSidebarOpen && window.innerWidth < 1024 ? (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 mt-16 bg-black bg-opacity-50 lg:hidden"
        />
      ) : null}

      {showProfileMenu ? (
        <div onClick={() => setShowProfileMenu(false)} className="fixed inset-0 z-40" />
      ) : null}
    </div>
  );
};

export default Sidebar;
