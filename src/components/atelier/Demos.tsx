"use client";

import { useState } from "react";
import { SearchInput } from "@/components/search/SearchBox";

/** 陈列廊演示：搜索框（真实组件，本页可用） */
export function SearchDemo() {
  const [query, setQuery] = useState("");
  return <SearchInput value={query} onChange={setQuery} placeholder="试试输入（真实组件）…" />;
}
