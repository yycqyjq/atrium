import type { Metadata } from "next";
import RoomStub from "@/components/RoomStub";

export const metadata: Metadata = { title: "工具房" };

export default function ToolsPage() {
  return (
    <RoomStub
      room="tools"
      title="工具房"
      sub="书签与常用工具。顺手就能拿到。"
      text="书签、小工具与快捷入口会在这里落成。"
    />
  );
}
