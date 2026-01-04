
import { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Badge } from './Badge';

interface Option {
    value: string;
    label: string;
}

interface MultiSelectProps {
    options: Option[];
    selected: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    className?: string;
}

export function MultiSelect({ options, selected, onChange, placeholder = "اختر...", className }: MultiSelectProps) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSelect = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter((item) => item !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    const handleSelectAll = () => {
        if (selected.length === filteredOptions.length) {
            // Deselect all visible
            const visibleValues = filteredOptions.map(o => o.value);
            onChange(selected.filter(s => !visibleValues.includes(s)));
        } else {
            // Select all visible
            const visibleValues = filteredOptions.map(o => o.value);
            const newSelected = Array.from(new Set([...selected, ...visibleValues]));
            onChange(newSelected);
        }
    };

    const filteredOptions = options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div
                className="flex min-h-[40px] w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                onClick={() => setOpen(!open)}
            >
                <div className="flex flex-wrap gap-1">
                    {selected.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
                    {selected.length > 0 && selected.length <= 2 && (
                        selected.map((val) => {
                            const label = options.find(o => o.value === val)?.label || val;
                            return (
                                <Badge key={val} variant="secondary" className="mr-1 mb-1">
                                    {label}
                                    <span
                                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            handleSelect(val);
                                        }}
                                    >
                                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                    </span>
                                </Badge>
                            );
                        })
                    )}
                    {selected.length > 2 && (
                        <Badge variant="secondary" className="mr-1">
                            {selected.length} تم اختيارهم
                        </Badge>
                    )}
                </div>
                <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
            </div>

            {open && (
                <div className="absolute top-full mt-2 w-full z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
                    <div className="p-2 border-b">
                        <input
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="بحث..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                        />
                    </div>
                    {filteredOptions.length > 0 && (
                        <div className="p-2 border-b">
                            <div
                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 cursor-pointer text-primary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectAll();
                                }}
                            >
                                <span>{selected.length === filteredOptions.length ? "إلغاء تحديد الكل" : "تحديد الكل"}</span>
                            </div>
                        </div>
                    )}
                    <div className="max-h-[200px] overflow-y-auto p-1">
                        {filteredOptions.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">لا توجد نتائج</div>
                        ) : (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.value}
                                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(option.value);
                                    }}
                                >
                                    <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${selected.includes(option.value) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"}`}>
                                        <Check className="h-4 w-4" />
                                    </div>
                                    <span>{option.label}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
