import { ReactNode, useState } from "react";
import { Sidebar } from "./sidebar";
import { useTheme } from "./theme-provider";
import { Moon, Sun, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type DialogMode = "clear" | "sample" | null;

export function Layout({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);

  async function handleReset(mode: "clear" | "sample") {
    setPending(true);
    setDialogMode(null);
    try {
      const res = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) throw new Error("Reset failed");
      await queryClient.invalidateQueries();
      toast({
        title: mode === "clear" ? "Cleared to zero" : "Sample data restored",
        description: mode === "clear"
          ? "All data has been permanently deleted."
          : "All data has been restored to the sample state.",
      });
    } catch {
      toast({ title: "Reset failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b flex items-center justify-between px-8 bg-card print:hidden flex-shrink-0">
          <h2 className="text-sm font-medium text-muted-foreground">Landlord Dashboard</h2>
          <div className="flex items-center gap-4">

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-muted-foreground border-dashed"
                  data-testid="button-reset-menu"
                  disabled={pending}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {pending ? "Working..." : "Reset"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  data-testid="menu-item-clear"
                  className="gap-2 text-destructive focus:text-destructive"
                  onClick={() => setDialogMode("clear")}
                >
                  <Trash2 className="h-4 w-4" />
                  Clear everything to zero
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-testid="menu-item-sample"
                  className="gap-2"
                  onClick={() => setDialogMode("sample")}
                >
                  <RotateCcw className="h-4 w-4" />
                  Restore sample data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="text-muted-foreground"
              data-testid="button-theme-toggle"
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
              AM
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Clear to zero confirmation */}
      <AlertDialog open={dialogMode === "clear"} onOpenChange={open => !open && setDialogMode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear everything to zero?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all properties, tenants, invoices, charges, and payments. You will start with a completely empty app. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleReset("clear")}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-clear-confirm"
            >
              Yes, delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore sample data confirmation */}
      <AlertDialog open={dialogMode === "sample"} onOpenChange={open => !open && setDialogMode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore sample data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all current data and replace it with the original sample tenants, invoices, and payments. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleReset("sample")}
              data-testid="button-sample-confirm"
            >
              Yes, restore sample data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
