"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Input, FieldLabel } from "@/components/ui/Field";
import Combobox from "@/components/ui/Combobox";
import Modal from "@/components/ui/Modal";
import { Toast, useToast } from "@/components/ui/Toast";
import Loading from "@/components/ui/Loading";

export type ToolFormValue = { name: string; url: string; description: string; category: string };

/**
 * 工具弹层：添加与编辑共用同一套弹窗（经公共 Modal 外壳，与画廊改名弹层同款）。
 * - mode="add"：提交 POST /api/tools
 * - mode="edit"：提交 PATCH /api/tools（以 initial 的 name/url 定位原条目）
 * 成功后收起弹层，并在页面底部浮出确认提示。
 */
export default function ToolDialog({
  open,
  mode,
  categories,
  initial,
  onClose,
}: {
  open: boolean;
  mode: "add" | "edit";
  categories: string[];
  initial?: ToolFormValue | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("https://");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");
  const { toast, showToast } = useToast();
  // 粘贴网址自动解析：回填名称/描述
  const [parsing, setParsing] = useState(false);
  const [parseNote, setParseNote] = useState("");
  const [parsedHost, setParsedHost] = useState("");
  const lastAutoName = useRef<string | null>(null);

  // 打开时按模式初始化表单
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setName(initial.name);
      setUrl(initial.url);
      setDescription(initial.description);
      setCategory(initial.category);
    } else {
      setName("");
      setUrl("");
      setDescription("");
      setCategory(categories[0] ?? "");
    }
    setState("idle");
    setMessage("");
    setParsing(false);
    setParseNote("");
    setParsedHost("");
    lastAutoName.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const close = useCallback(() => {
    setState("idle");
    setMessage("");
    onClose();
  }, [onClose]);

  const canSave = name.trim() !== "" && /^https?:\/\//i.test(url.trim()) && state !== "saving";

  /** 网址规范化：纯域名自动补 https://；含空格或不像网址则视为普通文本 */
  const normalizeUrl = (text: string) => {
    const value = text.trim();
    if (!value || /\s/.test(value)) return null;
    if (/^https?:\/\//i.test(value)) return value;
    if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(value)) return `https://${value}`;
    return null;
  };

  /** 抓取站点标题与描述并回填（不覆盖用户手填的内容） */
  const parseSite = async (target: string) => {
    setParsing(true);
    setParseNote("");
    setParsedHost("");
    try {
      const res = await fetch(`/api/site-info?url=${encodeURIComponent(target)}`);
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        title?: string;
        description?: string;
        host?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setParseNote(data.error ?? "解析失败，可手动填写");
        return;
      }
      if (data.host) setParsedHost(data.host);
      const filled: string[] = [];
      if (data.title && (!name.trim() || name === lastAutoName.current)) {
        setName(data.title);
        lastAutoName.current = data.title;
        filled.push("名称");
      }
      if (data.description && !description.trim()) {
        setDescription(data.description);
        filled.push("描述");
      }
      setParseNote(
        filled.length > 0
          ? `已从网页带回${filled.join("与")}，可修改。`
          : "未发现可回填的信息，手动补充即可。",
      );
    } catch {
      setParseNote("解析失败，可手动填写");
    } finally {
      setParsing(false);
    }
  };

  const onUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const normalized = normalizeUrl(e.clipboardData.getData("text"));
    if (!normalized) return; // 不是纯网址：保持默认粘贴
    e.preventDefault();
    setUrl(normalized);
    void parseSite(normalized);
  };

  async function save() {
    setState("saving");
    setMessage("");
    try {
      const payload =
        mode === "edit" && initial
          ? {
              kind: "tool",
              oldName: initial.name,
              oldUrl: initial.url,
              name: name.trim(),
              url: url.trim(),
              description: description.trim(),
              category: category.trim() || "未分类",
            }
          : {
              name: name.trim(),
              url: url.trim(),
              description: description.trim(),
              category: category.trim() || "未分类",
            };
      const res = await fetch("/api/tools", {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setState("error");
        setMessage(data.error ?? "保存失败，请稍后再试");
        return;
      }
      const finalName = name.trim();
      showToast(mode === "edit" ? `「${finalName}」已更新。` : `「${finalName}」已加入清单。`);
      close();
      router.refresh();
    } catch {
      setState("error");
      setMessage("网络异常，请稍后再试");
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={close}
        title={mode === "edit" ? "编辑工具" : "添加工具"}
        ariaLabel={mode === "edit" ? "编辑工具" : "添加工具"}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel htmlFor="tool-name">名称 *</FieldLabel>
            <Input
              id="tool-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="工具名称"
              autoFocus
            />
          </div>
          <div>
            <FieldLabel htmlFor="tool-url">地址 *</FieldLabel>
            <Input
              id="tool-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onPaste={onUrlPaste}
              placeholder="https://"
            />
            {parsing ? (
              <div className="mt-2">
                <Loading size="sm" label="正在解析站点信息…" />
              </div>
            ) : parseNote ? (
              <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-3">
                {parsedHost ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/icon?d=${encodeURIComponent(parsedHost)}`}
                    alt=""
                    width={16}
                    height={16}
                    className="size-4 shrink-0 rounded-[4px]"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : null}
                {parseNote}
              </p>
            ) : (
              <p className="mt-2 text-[12px] text-ink-3">
                粘贴网址后自动解析标题与描述，并带上站点图标。
              </p>
            )}
          </div>
          <div>
            <FieldLabel htmlFor="tool-desc">描述</FieldLabel>
            <Input
              id="tool-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="一句话说明（可选）"
            />
          </div>
          <div>
            <FieldLabel htmlFor="tool-cat">分类</FieldLabel>
            <Combobox
              id="tool-cat"
              value={category}
              onChange={setCategory}
              options={categories}
              placeholder="输入或选择分类"
            />
          </div>
        </div>

        {state === "error" ? <p className="mt-3 text-[12.5px] text-accent-ink">{message}</p> : null}

        <div className="mt-5 flex items-center gap-3">
          <Button onClick={save} disabled={!canSave}>
            {state === "saving" ? "保存中…" : mode === "edit" ? "保存修改" : "保存到清单"}
          </Button>
          <Button variant="quiet" size="sm" onClick={close}>
            关闭
          </Button>
        </div>
      </Modal>
      <Toast toast={toast} />
    </>
  );
}
