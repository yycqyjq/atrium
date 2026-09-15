"use client";

import { useEffect, useState } from "react";

export default function Greeting() {
  const [greet, setGreet] = useState("你好。");
  const [date, setDate] = useState("");

  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    let t = "晚上好。";
    if (h >= 5 && h < 11) t = "早上好。";
    else if (h >= 11 && h < 13) t = "中午好。";
    else if (h >= 13 && h < 18) t = "下午好。";
    else if (h >= 23 || h < 5) t = "夜深了。";
    setGreet(t);

    const days = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    setDate(`${now.getMonth() + 1}月${now.getDate()}日 ${days[now.getDay()]}`);
  }, []);

  return (
    <div>
      <p className="mb-[14px] text-[12.5px] tracking-[0.08em] text-ink-3 tabular-nums">
        {date}
      </p>
      <h1 className="mb-[14px] font-serif text-[clamp(32px,4.6vw,44px)] font-semibold leading-[1.16]">
        {greet}
      </h1>
      <p className="max-w-[32em] text-ink-2">
        欢迎回到中庭。骨架已经立好，内容会一间一间搬进来。
      </p>
    </div>
  );
}
