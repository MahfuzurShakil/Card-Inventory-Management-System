import { useState } from 'react';
import { 
  LayoutDashboard, FileText, Ship, Package, Warehouse, BarChart3,
  Factory, Users, Calendar, DollarSign, ChevronDown, ChevronRight,
  Box, Layers, ClipboardList, Receipt, TrendingUp, FileSpreadsheet,
  User, LogOut, Menu, Inbox, Activity, Bell, Settings, Lock, UserCircle,Truck
} from 'lucide-react';

const Sidebar = ({ currentView, setCurrentView, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({
    procurement: false,
    store: false,
    production: false,
    employees: false,
    finance: false
  });

  const toggleMenu = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      view: 'dashboard'
    },
    {
      id: 'procurement',
      label: 'Procurement',
      icon: Ship,
      expandable: true,
      submenu: [
        { id: 'procurement-dashboard', label: 'Procurement Overview', icon: Ship, view: 'procurement-dashboard' },
        { id: 'lc-list', label: 'Letters of Credit', icon: FileText, view: 'lc-list' },
        { id: 'all-shipments', label: 'Shipments', icon: Package, view: 'all-shipments' },
        // { id: 'reports', label: 'Reports', icon: BarChart3, view: 'reports' }
      ]
    },
    {
      id: 'store',
      label: 'Store',
      icon: Warehouse,
      expandable: true,
      submenu: [
        { id: 'inbound-list', label: 'Inbound Material', icon: Inbox, view: 'inbound-list' },
      ]
    },
    {
      id: 'production',
      label: 'Production',
      icon: Factory,
      expandable: true,
      submenu: [
        { id: 'production-dashboard', label: 'Overview', icon: BarChart3, view: 'production-dashboard' },
        { id: 'box-list', label: 'Material Boxes', icon: Box, view: 'box-list' },
        { id: 'production', label: 'Production Tracking', icon: Activity, view: 'production' },
        { id: 'subbox-list', label: 'Finished Goods', icon: Layers, view: 'subbox-list' },
        { id: 'delivered-goods',   label: 'Delivered Goods',   icon: Truck,   view: 'delivered-goods'   },
      ]
    },
    // {
    //   id: 'employees',
    //   label: 'Employee Management',
    //   icon: Users,
    //   expandable: true,
    //   submenu: [
    //     { id: 'employee-list', label: 'Employees', icon: Users, view: 'employee-list' },
    //     { id: 'shift-assignment', label: 'Shift Assignment', icon: Calendar, view: 'shift-assignment' }
    //   ]
    // },

    {
  id: 'employees',
  label: 'Employee Management',
  icon: Users,
  expandable: true,
  submenu: [
    { id: 'employee-list',   label: 'Employees',     icon: Users,     view: 'employee-list'   },
    { id: 'shift-roster-list', label: 'Shift Rosters', icon: Calendar, view: 'shift-roster-list' }
  ]
},
    {
      id: 'finance',
      label: 'Finance',
      icon: DollarSign,
      expandable: true,
      submenu: [
        { id: 'finance-dashboard', label: 'Finance Overview', icon: BarChart3,  view: 'finance-dashboard' },
        { id: 'landing-cost',      label: 'Landing Cost',     icon: TrendingUp, view: 'landing-cost'      },
        { id: 'local-costs',       label: 'Local Costs',      icon: Receipt,    view: 'local-costs'       },
      ]
    }
  ];

  const handleNavigation = (view) => {
    setCurrentView(view);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const renderMenuItem = (item) => {
    if (item.expandable) {
      const isExpanded = expandedMenus[item.id];
      const Icon = item.icon;
      
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleMenu(item.id)}
            className="w-full flex items-center justify-between px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {item.submenu.map(subItem => {
                const SubIcon = subItem.icon;
                const isActive = currentView === subItem.view;
                
                return (
                  <button
                    key={subItem.id}
                    onClick={() => handleNavigation(subItem.view)}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600 font-medium' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <SubIcon className="w-4 h-4" />
                    <span className="text-sm">{subItem.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    } else {
      const Icon = item.icon;
      const isActive = currentView === item.view;
      
      return (
        <button
          key={item.id}
          onClick={() => handleNavigation(item.view)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            isActive 
              ? 'bg-blue-600 text-white font-medium' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Icon className="w-5 h-5" />
          <span className="font-medium">{item.label}</span>
        </button>
      );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={isSidebarOpen ? "Hide navigation" : "Show navigation"}
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>

          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>

          <div>
            <h1 className="text-lg font-semibold text-gray-900">Card Factory Management System</h1>
          </div>
        </div>

        <div className="flex-1"></div>

        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          <div className="relative">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium hidden md:inline">Profile</span>
              <ChevronDown className="w-4 h-4 text-gray-500 hidden md:block" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Production Manager</p>
                      <p className="text-sm text-gray-500">manager@cardfactory.com</p>
                    </div>
                  </div>
                </div>

                <div className="py-2">
                  <button 
                    onClick={() => {
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <UserCircle className="w-4 h-4" />
                    <span>Profile Details</span>
                  </button>

                  <button 
                    onClick={() => {
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Update Password</span>
                  </button>

                  <button 
                    onClick={() => {
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                </div>

                <div className="border-t border-gray-200 pt-2">
                  <button 
                    onClick={() => {
                      setShowProfileMenu(false);
                      console.log('Logging out...');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed left-0 top-16 bottom-0 z-40 w-72 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out flex flex-col`}
      >
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {menuItems.map(item => renderMenuItem(item))}
        </nav>
      </div>

      <div 
        className={`flex-1 overflow-auto transition-all duration-300 ${
          isSidebarOpen ? 'ml-72' : 'ml-0'
        } mt-16`}
      >
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </div>

      {isSidebarOpen && window.innerWidth < 1024 && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30 mt-16"
        />
      )}

      {showProfileMenu && (
        <div
          onClick={() => setShowProfileMenu(false)}
          className="fixed inset-0 z-40"
        />
      )}
    </div>
  );
};

export default Sidebar;
