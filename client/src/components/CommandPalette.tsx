import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useEffect, useState } from "react";
import { Search, Plus, Save, FileText, FolderPlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative h-8 w-full justify-start max-w-sm text-sm text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        Type a command or search...
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <VisuallyHidden>
          <h2 id="command-dialog-title">Command Palette</h2>
          <p id="command-dialog-description">
            Use the command palette to navigate and perform actions.
          </p>
        </VisuallyHidden>
        <CommandInput 
          placeholder="Type a command or search..." 
          aria-labelledby="command-dialog-title"
          aria-describedby="command-dialog-description"
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="File Operations">
            <CommandItem
              onSelect={() => runCommand(() => console.log("New File"))}
            >
              <Plus className="mr-2 h-4 w-4" />
              New File
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => console.log("New Folder"))}
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              New Folder
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => console.log("Save"))}
            >
              <Save className="mr-2 h-4 w-4" />
              Save
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Upload">
            <CommandItem
              onSelect={() => runCommand(() => console.log("Upload File"))}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload File
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}