"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { IconPlus } from "@/components/icons";
import ToolDialog from "./ToolDialog";

/** 添加工具：头部入口 + 共用弹层（ToolDialog · add 模式） */
export default function ToolsAdd({ categories }: { categories: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="text" className="group" onClick={() => setOpen(true)}>
        添加工具
        <IconPlus className="size-[13px] transition-transform duration-200 group-hover:rotate-90" />
      </Button>
      <ToolDialog open={open} mode="add" categories={categories} onClose={() => setOpen(false)} />
    </>
  );
}
