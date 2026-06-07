import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  CreditCard,
  Settings,
} from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Properties", href: "/properties", icon: Building2 },
    { name: "Tenants", href: "/tenants", icon: Users },
    { name: "Invoices", href: "/invoices", icon: FileText },
    { name: "Payments", href: "/payments", icon: CreditCard },
  ];

  return (
    <aside className="w-64 border-r bg-sidebar flex-shrink-0 flex flex-col h-full print:hidden">
      <div className="h-16 flex items-center px-6 border-b">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
            <Building2 className="w-5 h-5" />
          </div>
          RentEase
        </Link>
      </div>

      <nav className="p-4 flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-200",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t mt-auto">
        <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground">
          <Settings className="w-4 h-4" />
          <span>v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
