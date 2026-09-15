import type { Metadata } from "next";
import RoomStub from "@/components/RoomStub";

export const metadata: Metadata = { title: "书房" };

export default function StudyPage() {
  return (
    <RoomStub
      room="study"
      title="书房"
      sub="文章与长文。读也好，写也好，都在这里。"
      text="文章列表与阅读页会在这里落成。"
    />
  );
}
