"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { fetchRepositories } from "@/app/actions/repositories";
import { Repository } from "@/lib/github";

interface RepoSelectorProps {
  selectedRepos: string[];
  onSelectionChange: (repos: string[]) => void;
}

export function RepoSelector({
  selectedRepos,
  onSelectionChange,
}: RepoSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [repositories, setRepositories] = React.useState<Repository[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadRepositories() {
      setLoading(true);
      setError(null);
      const result = await fetchRepositories();
      if (!result.success) {
        setError(result.error);
        setRepositories([]);
      } else {
        setRepositories(result.data);
      }
      setLoading(false);
    }
    loadRepositories();
  }, []);

  const toggleRepo = (repoName: string) => {
    if (selectedRepos.includes(repoName)) {
      onSelectionChange(selectedRepos.filter((r) => r !== repoName));
    } else {
      onSelectionChange([...selectedRepos, repoName]);
    }
  };

  const getButtonText = () => {
    if (loading) {
      return "Loading repositories...";
    }
    if (error) {
      return "Rate limit exceeded";
    }
    if (repositories.length === 0) {
      return "No repositories found";
    }
    if (selectedRepos.length === 0) {
      return "Select repositories...";
    }
    if (selectedRepos.length === 1) {
      return selectedRepos[0];
    }
    return `${selectedRepos.length} repositories selected`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            error && "border-destructive text-destructive"
          )}
          disabled={loading || repositories.length === 0 || !!error}
        >
          {error && <AlertCircle className="mr-2 h-4 w-4 shrink-0" />}
          <span className="truncate">{getButtonText()}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search repositories..." />
          <CommandList>
            <CommandEmpty>No repositories found.</CommandEmpty>
            <CommandGroup>
              {repositories.map((repo) => (
                <CommandItem
                  key={repo.id}
                  value={repo.name}
                  onSelect={() => toggleRepo(repo.name)}
                >
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      selectedRepos.includes(repo.name)
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                  >
                    <CheckIcon className="h-4 w-4" />
                  </div>
                  <span className="truncate">{repo.name}</span>
                  {repo.private && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      Private
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
