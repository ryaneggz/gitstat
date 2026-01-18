"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
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

  React.useEffect(() => {
    async function loadRepositories() {
      setLoading(true);
      const repos = await fetchRepositories();
      setRepositories(repos);
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
          className="w-full justify-between"
          disabled={loading || repositories.length === 0}
        >
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
