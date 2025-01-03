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
import { Search, Plus, Save, FileText, FolderPlus, Upload, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useToast } from "@/hooks/use-toast";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { toast } = useToast();

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

  const runCommand = async (command: () => void | Promise<void>) => {
    setOpen(false);
    try {
      await command();
    } catch (error) {
      console.error("Failed to run command:", error);
      toast({
        title: "Error",
        description: "Failed to execute command",
        variant: "destructive"
      });
    }
  };

  const handleAskAI = async () => {
    if (!query.trim()) {
      toast({
        title: "Error",
        description: "Please enter a question first",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: "",
          prompt: query
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      toast({
        title: "AI Response",
        description: data.response,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response",
        variant: "destructive"
      });
    }
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
        <div className="flex items-center gap-2 p-2">
          <CommandInput 
            placeholder="Ask AI Assistant..." 
            value={query}
            onValueChange={setQuery}
            aria-labelledby="command-dialog-title"
            aria-describedby="command-dialog-description"
            className="flex-1"
          />
          <Button 
            variant="destructive"
            size="sm"
            onClick={() => runCommand(handleAskAI)}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
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
              onSelect={() => runCommand(() => console.log("Save"))}
            >
              <Save className="mr-2 h-4 w-4" />
              Save
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="AI Assistant">
            <CommandItem
              onSelect={() => runCommand(handleAskAI)}
            >
              <Send className="mr-2 h-4 w-4" />
              Ask AI Assistant
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}