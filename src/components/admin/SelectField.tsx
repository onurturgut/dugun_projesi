"use client";
import { Children, isValidElement, type ReactNode } from "react";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

export function SelectField({
  children,
  className = "",
  onValueChange,
  ...props
}: {
  children: ReactNode;
  name?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  "aria-label"?: string;
  className?: string;
  onValueChange?: (value: string) => void;
}) {
  const { "aria-label": label, ...rootProps } = props;
  return (
    <Select.Root {...rootProps} onValueChange={onValueChange}>
      <Select.Trigger
        className={`admin-control admin-select-trigger ${className}`}
        aria-label={label}
      >
        <Select.Value placeholder="Seçiniz" />
        <Select.Icon>
          <ChevronDown size={16} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="admin-select-menu"
          position="popper"
          sideOffset={6}
          collisionPadding={12}
        >
          <Select.ScrollUpButton className="admin-select-scroll">
            <ChevronUp size={16} />
          </Select.ScrollUpButton>
          <Select.Viewport>
            {Children.toArray(children).map((child) => {
              if (
                !isValidElement<{
                  value?: string;
                  children?: ReactNode;
                  disabled?: boolean;
                }>(child)
              )
                return null;
              const value = child.props.value ?? String(child.props.children);
              return (
                <Select.Item
                  key={value}
                  value={value}
                  disabled={child.props.disabled}
                  className="admin-select-item"
                >
                  <Select.ItemText>{child.props.children}</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check size={16} />
                  </Select.ItemIndicator>
                </Select.Item>
              );
            })}
          </Select.Viewport>
          <Select.ScrollDownButton className="admin-select-scroll">
            <ChevronDown size={16} />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
