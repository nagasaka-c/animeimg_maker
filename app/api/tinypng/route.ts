import tinify from "tinify";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const apiKey = process.env.TINYPNG_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "TINYPNG_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  const buf = await req.arrayBuffer();
  if (buf.byteLength === 0) {
    return Response.json({ error: "Empty body" }, { status: 400 });
  }

  tinify.key = apiKey;

  try {
    // Pre-flight check: if compressionCount already >= 500 we abort.
    const before = tinify.compressionCount;
    if (typeof before === "number" && before >= 500) {
      return Response.json(
        {
          error: "tinypng_quota_exceeded",
          message: "TinyPNG APIの月500回上限に達しました",
          count: before,
        },
        { status: 429 }
      );
    }

    const compressed = await tinify.fromBuffer(Buffer.from(buf)).toBuffer();
    const after = tinify.compressionCount;

    const slab = compressed.buffer.slice(
      compressed.byteOffset,
      compressed.byteOffset + compressed.byteLength
    ) as ArrayBuffer;
    return new Response(slab, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "X-Compression-Count": typeof after === "number" ? String(after) : "",
      },
    });
  } catch (err: unknown) {
    const isAccount =
      typeof err === "object" && err !== null && err.constructor?.name === "AccountError";
    if (isAccount) {
      return Response.json(
        {
          error: "tinypng_quota_exceeded",
          message: "TinyPNG APIの月500回上限に達したか、認証情報が無効です",
        },
        { status: 429 }
      );
    }
    const message = err instanceof Error ? err.message : "TinyPNG圧縮に失敗しました";
    return Response.json({ error: "tinypng_failed", message }, { status: 502 });
  }
}
