"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Combobox from "@/components/ui/Combobox";

/**
 * 画廊上传：选择本地图片 → 直传图床仓库（GitHub Contents API）。
 * galleryDir 可指定子目录（缺省仓库根）；文件名冲突时自动加时间戳后缀。
 * 仅限本地服务使用。
 */
export default function GalleryUpload({ dir, albums }: { dir: string; albums: string[] }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const ROOT = "仓库根";
  const [target, setTarget] = useState(dir || ROOT);
  const [dragOver, setDragOver] = useState(false);

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setState("uploading");
    setMessage(`准备上传 ${files.length} 张…`);

    const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif)$/i;
    let ok = 0;
    const failed: string[] = [];

    for (const file of Array.from(files)) {
      if (!IMAGE_RE.test(file.name)) {
        failed.push(`${file.name}（不是图片）`);
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        failed.push(`${file.name}（超过 20MB）`);
        continue;
      }
      try {
        const buffer = await file.arrayBuffer();
        let base64 = "";
        const bytes = new Uint8Array(buffer);
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          base64 += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        const contentBase64 = btoa(base64);

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentBase64,
            dir: target === ROOT ? "" : target.trim(),
          }),
        });
        const data = (await res.json()) as { ok?: boolean; path?: string; error?: string };
        if (!res.ok || !data.ok) {
          failed.push(`${file.name}（${data.error ?? "上传失败"}）`);
          continue;
        }
        ok += 1;
        setMessage(`已上传 ${ok} / ${files.length} 张…`);
      } catch {
        failed.push(`${file.name}（网络异常）`);
      }
    }

    if (ok > 0 && failed.length === 0) {
      setState("done");
      setMessage(
        `已上传 ${ok} 张到 ${target === ROOT ? "仓库根" : target}。图床仓库刷新后即可在画廊看到。`,
      );
      router.refresh();
    } else if (ok > 0) {
      setState("done");
      setMessage(`成功 ${ok} 张；失败：${failed.join("、")}`);
      router.refresh();
    } else {
      setState("error");
      setMessage(failed.join("、") || "上传失败");
    }
  }

  const box = `rounded-ctl border border-dashed px-6 py-8 text-center transition-colors duration-200 ${
    dragOver ? "border-accent bg-accent-soft" : "border-line-strong hover:border-accent"
  }`;

  return (
    <div className="mb-10">
      <div
        className={box}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          uploadFiles(e.dataTransfer.files);
        }}
      >
        {state === "uploading" ? (
          <p className="text-[13.5px] text-ink-2">{message}</p>
        ) : (
          <>
            <p className="mb-2 text-[13.5px] text-ink-2">
              拖拽图片到这里，或
              <label className="mx-1 cursor-pointer text-accent underline decoration-accent/40 underline-offset-4 transition-colors duration-150 hover:text-accent-hover">
                选择文件
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => uploadFiles(e.target.files)}
                />
              </label>
              直传图床仓库
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 text-[12px] text-ink-3">
              <span>支持多选，单张不超过 20MB；文件名冲突自动加时间戳。存入</span>
              <Combobox
                id="upload-dir"
                size="sm"
                autoWidth
                value={target}
                onChange={setTarget}
                options={[ROOT, ...albums]}
                placeholder="选择或输入相册"
                customHint={(input: string) => `新建相册「${input}」`}
              />
              <span>目录</span>
            </div>
          </>
        )}
      </div>
      {state === "error" || state === "done" ? (
        <p className={`mt-3 text-[12.5px] ${state === "error" ? "text-accent-ink" : "text-ink-3"}`}>
          {message}
          {state === "error" ? " " : ""}
          {state === "done" ? " " : ""}
          <Button
            variant="quiet"
            className="underline decoration-line underline-offset-4"
            onClick={() => {
              setState("idle");
              setMessage("");
            }}
          >
            再传一批
          </Button>
        </p>
      ) : null}
    </div>
  );
}
