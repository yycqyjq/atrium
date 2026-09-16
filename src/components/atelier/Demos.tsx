"use client";

import { useState } from "react";
import { SearchInput } from "@/components/search/SearchBox";
import Combobox from "@/components/ui/Combobox";

/** 陈列廊演示：搜索框（真实组件，本页可用） */
export function SearchDemo() {
  const [query, setQuery] = useState("");
  return <SearchInput value={query} onChange={setQuery} placeholder="试试输入（真实组件）…" />;
}

/** 陈列廊演示：可输入下拉（真实组件，本页可用） */
export function ComboboxDemo() {
  const [value, setValue] = useState("工具");
  return (
    <Combobox
      id="demo-combobox"
      value={value}
      onChange={setValue}
      options={["博客论坛", "工具", "软件下载", "开发工具", "政府"]}
      placeholder="输入或选择分类"
    />
  );
}
