import { Check, ChevronsUpDown } from "lucide-react";
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
import { cn } from "@/lib/utils";

type MultiSelectDropdownProps = {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
};

export function MultiSelectDropdown({
  label,
  options,
  selected,
  onToggle,
}: MultiSelectDropdownProps) {
  const selectedCount = selected.length;
  const summary =
    selectedCount === 0
      ? `Todos os ${label.toLowerCase()}`
      : `${label} (${selectedCount})`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="min-w-[220px] justify-between rounded-xl border-white/10 bg-background/70 text-foreground shadow-none hover:bg-background/90"
        >
          <span className="truncate text-left">{summary}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="panel-card w-[300px] p-0 text-foreground"
        align="start"
      >
        <Command className="bg-transparent">
          <CommandInput
            placeholder={`Buscar ${label.toLowerCase()}...`}
            className="text-foreground"
          />
          <CommandList>
            <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
            <CommandGroup>
              {options.map(option => {
                const isSelected = selected.includes(option);

                return (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => onToggle(option)}
                    className="cursor-pointer gap-2 rounded-lg"
                  >
                    <div
                      className={cn(
                        "flex size-4 items-center justify-center rounded-sm border border-white/10",
                        isSelected &&
                          "border-emerald-500 bg-emerald-500 text-white"
                      )}
                    >
                      {isSelected ? <Check className="size-3" /> : null}
                    </div>
                    <span className="truncate">{option}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
