import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";

export async function GET() {
  const docs = await forgeFlowService.docRepository.list();

  const mapped = await Promise.all(
    docs.map(async (doc) => {
      const chunks = await forgeFlowService.chunkRepository.getByDocumentId(doc.id);
      return {
        id: doc.id,
        name: doc.title,
        size: `${((doc.metadata?.fileSize as number) || 1024) / 1024} KB`,
        chunks: chunks.length,
        embeddings: chunks.length,
        status: doc.status === "ready" ? ("embedded" as const) : ("processing" as const),
        uploadedAt: doc.createdAt || new Date().toISOString(),
      };
    })
  );

  return NextResponse.json(mapped);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, sizeBytes } = body;

    const docId = `doc-${Date.now()}`;
    const doc = await forgeFlowService.docRepository.create({
      id: docId,
      sourceId: "src-upload",
      title: name,
      status: "ready",
      storagePath: `/storage/uploads/${name}`,
      metadata: {
        fileName: name,
        fileSize: sizeBytes || 1024,
        mimeType: "text/plain",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    const mockChunksCount = Math.floor(Math.random() * 40) + 10;
    const chunkPromises = [];
    for (let i = 0; i < mockChunksCount; i++) {
      chunkPromises.push({
        documentId: docId,
        index: i,
        content: `Chunk ${i} from uploaded file ${name}`,
        tokenCount: 10,
        metadata: {},
      });
    }

    await forgeFlowService.chunkRepository.createMany(chunkPromises);

    return NextResponse.json({
      success: true,
      file: {
        id: doc.id,
        name: doc.title,
        size: `${((sizeBytes || 1024) / 1024).toFixed(1)} KB`,
        chunks: mockChunksCount,
        embeddings: mockChunksCount,
        status: "embedded" as const,
        uploadedAt: doc.createdAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing document ID" }, { status: 400 });
    }
    
    // Check if it exists
    const doc = await forgeFlowService.docRepository.getById(id);
    if (!doc) {
      return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
    }
    
    // Delete from repository
    await forgeFlowService.docRepository.delete(id);
    // Delete associated chunks
    await forgeFlowService.chunkRepository.deleteByDocumentId(id);
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
