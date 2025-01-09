import { useLocation } from "wouter";
import { 
  Home,
  Upload,
  FileCode,
  Settings,
  Download,
  Copy
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItemProps {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  active?: boolean;
}

const NavItem = ({ icon, tooltip, onClick, active }: NavItemProps) => {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={`p-2 rounded-lg transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {icon}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          <p className="text-sm">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default function NavigationBar() {
  const [location, setLocation] = useLocation();

  const handleClone = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.xlsx,.xls,.doc,.docx';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log('File selected:', file);
        // TODO: Implement file processing
      }
    };
    input.click();
  };

  return (
    <nav className="fixed left-0 top-0 h-full w-16 bg-background border-r flex flex-col items-center py-4 space-y-4 shadow-sm">
      <NavItem
        icon={<Home className="h-5 w-5" />}
        tooltip="Home"
        onClick={() => setLocation("/")}
        active={location === "/"}
      />

      <NavItem
        icon={<FileCode className="h-5 w-5" />}
        tooltip="Code Editor"
        onClick={() => setLocation("/editor")}
        active={location === "/editor"}
      />

      <NavItem
        icon={<Upload className="h-5 w-5" />}
        tooltip="Upload & Clone Application"
        onClick={handleClone}
      />

      <NavItem
        icon={<Download className="h-5 w-5" />}
        tooltip="Export Application"
        onClick={() => setLocation("/export")}
        active={location === "/export"}
      />

      <NavItem
        icon={<Copy className="h-5 w-5" />}
        tooltip="Clone from Screenshot"
        onClick={handleClone}
      />

      <NavItem
        icon={<Settings className="h-5 w-5" />}
        tooltip="Settings"
        onClick={() => setLocation("/settings")}
        active={location === "/settings"}
      />
    </nav>
  );
}