import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function parseCommand(text: string) {
  const m = text.match(/^\/(결투장해)\s+(?<cmd>길드랭킹|정보|게시글)\s*(?<rest>.*)$/);
  if (!m) return null;
  const cmd = m.groups?.cmd ?? "";
  const rest = (m.groups?.rest ?? "").trim();
  return { cmd, rest };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const utter = body?.userRequest?.utterance || body?.utterance || "";
  const parsed = parseCommand(utter);
  const base = process.env.PUBLIC_URL || process.env.NEXT_PUBLIC_BASE_URL || "";

  let url = base || "";
  let title = "결투장해";
  if (parsed) {
    if (parsed.cmd === "길드랭킹") {
      const guild = parsed.rest || "항마압축파";
      url = `${base}/guild/${encodeURIComponent(guild)}/ranking`;
      title = `길드랭킹: ${guild}`;
    } else if (parsed.cmd === "게시글") {
      const id = parsed.rest.match(/(\d{3,})/)?.[1] ?? "";
      url = `${base}/post/${id}`;
      title = `게시글 ${id}`;
    } else if (parsed.cmd === "정보") {
      const nick = parsed.rest.trim();
      url = `${base}/user/${encodeURIComponent(nick)}`;
      title = `정보: ${nick}`;
    }
  }

  const resp = {
    version: "2.0",
    template: {
      outputs: [
        {
          basicCard: {
            title,
            description: "요청하신 정보를 확인하세요.",
            thumbnail: { imageUrl: `${base}/og/guild/항마압축파.png` },
            buttons: [{ action: "webLink", label: "바로보기", webLinkUrl: url }],
          },
        },
      ],
    },
  };
  return NextResponse.json(resp);
}
