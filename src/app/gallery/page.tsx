import type { Metadata } from "next";
import RoomStub from "@/components/RoomStub";

export const metadata: Metadata = { title: "画廊" };

export default function GalleryPage() {
  return (
    <RoomStub
      room="gallery"
      title="画廊"
      sub="照片与影像。存放目光的地方。"
      text="图片流、相册与照片墙会在这里落成。"
    />
  );
}
