import type { Metadata } from "next";
import RoomStub from "@/components/RoomStub";

export const metadata: Metadata = { title: "陈列廊" };

export default function AtelierPage() {
  return (
    <RoomStub
      room="atelier"
      title="陈列廊"
      sub="组件与实验。作品的小展台。"
      text="组件与实验作品会在这里落成。"
    />
  );
}
