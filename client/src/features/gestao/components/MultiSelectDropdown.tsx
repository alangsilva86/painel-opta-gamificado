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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="min-w-[190px] justify-between border-slate-800 bg-slate-950 text-slate-200"
        >
          <span className="truncate">
            {label} ({selectedCount} selecionados)
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] border-slate-800 bg-slate-950 p-0 text-slate-100"
        align="start"
      >
        <Command className="bg-slate-950">
          <CommandInput
            placeholder={`Buscar ${label.toLowerCase()}...`}
            className="text-slate-100"
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
                    className="cursor-pointer"
                  >
                    <div
                      className={cn(
                        "flex size-4 items-center justify-center rounded-sm border border-slate-700",
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
