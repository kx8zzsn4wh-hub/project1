import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { deleteLeafTag, mergeLeafTags, moveLeafTag } from "@/lib/tagManagement";

type MovePayload = {
  action: "move";
  sourcePath?: string;
  targetParentPath?: string;
};

type DeletePayload = {
  action: "delete";
  path?: string;
};

type MergePayload = {
  action: "merge";
  sourcePath?: string;
  targetPath?: string;
};

type ManageTagsPayload = MovePayload | DeletePayload | MergePayload;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  let body: ManageTagsPayload;

  try {
    body = (await request.json()) as ManageTagsPayload;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
  }

  try {
    if (body.action === "move") {
      const sourcePath = typeof body.sourcePath === "string" ? body.sourcePath : "";
      const targetParentPath = typeof body.targetParentPath === "string" ? body.targetParentPath : "";

      if (!sourcePath || !targetParentPath) {
        return NextResponse.json({ ok: false, message: "sourcePath と targetParentPath は必須です。" }, { status: 400 });
      }

      await moveLeafTag(sourcePath, targetParentPath);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "delete") {
      const targetPath = typeof body.path === "string" ? body.path : "";
      if (!targetPath) {
        return NextResponse.json({ ok: false, message: "path は必須です。" }, { status: 400 });
      }

      await deleteLeafTag(targetPath);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "merge") {
      const sourcePath = typeof body.sourcePath === "string" ? body.sourcePath : "";
      const targetPath = typeof body.targetPath === "string" ? body.targetPath : "";

      if (!sourcePath || !targetPath) {
        return NextResponse.json({ ok: false, message: "sourcePath と targetPath は必須です。" }, { status: 400 });
      }

      await mergeLeafTags(sourcePath, targetPath);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, message: "未対応の action です。" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "タグ管理に失敗しました。";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
